#include <emscripten/bind.h>
#include <hunspell/hunspell.hxx>
#include "parsers/textparser.hxx"
#include <sstream>
#include <string>
#include <vector>

/**
 * A single tokenized word together with its byte offset within the original
 * text string and its byte length.  Returned as a value object so that
 * JavaScript receives a plain `{ word, offset, length }` object.
 */
struct TokenResult {
  std::string word;
  int offset;
  int length;
};

/**
 * Thin C++ wrapper around Hunspell, exposed to JavaScript via Emscripten
 * bindings. Dictionary files are written to the in-memory virtual filesystem
 * before the Hunspell instance is created so that no native filesystem access
 * is required in the browser / worker environment.
 */
class HunspellChecker {
 public:
  /**
   * @param affContent  Raw content of the .aff affix file (UTF-8 string)
   * @param dicContent  Raw content of the .dic dictionary file (UTF-8 string)
   */
  HunspellChecker(const std::string& affContent,
                  const std::string& dicContent) {
    FILE* f = fopen("/tmp/hunspell.aff", "wb");
    fwrite(affContent.c_str(), 1, affContent.size(), f);
    fclose(f);

    f = fopen("/tmp/hunspell.dic", "wb");
    fwrite(dicContent.c_str(), 1, dicContent.size(), f);
    fclose(f);

    hs_ = new Hunspell("/tmp/hunspell.aff", "/tmp/hunspell.dic");
  }

  ~HunspellChecker() { delete hs_; }

  /** Returns true if the word is correctly spelled. */
  bool spell(const std::string& word) const {
    return hs_->spell(word) != 0;
  }

  /** Returns a list of suggested corrections for a misspelled word. */
  std::vector<std::string> suggest(const std::string& word) const {
    return hs_->suggest(word);
  }

  /** Add a word to the runtime dictionary (not persisted across instances). */
  void addWord(const std::string& word) { hs_->add(word); }

  /**
   * Tokenize @p text into words using Hunspell's built-in TextParser, which
   * respects the word-character set defined in the loaded .aff file.
   *
   * The text is split into lines; each line is fed to a TextParser instance.
   * For every token the parser finds, `get_word()` strips leading/trailing
   * non-word characters and the resulting word together with its byte offset
   * in the original text and its byte length is appended to the result vector.
   *
   * Empty tokens (e.g. from punctuation-only runs) are skipped.
   */
  std::vector<TokenResult> tokenize(const std::string& text) const {
    std::vector<TokenResult> results;

    // Build a TextParser seeded with this dictionary's word characters so
    // that word-boundary detection matches Hunspell's own understanding of
    // what constitutes a valid word in this language.
    TextParser* parser = nullptr;
    const std::vector<w_char>& wcu16 = hs_->get_wordchars_utf16();
    if (!wcu16.empty()) {
      parser = new TextParser(wcu16.data(), static_cast<int>(wcu16.size()));
    } else {
      parser = new TextParser(hs_->get_wordchars());
    }

    // Process the text line-by-line, tracking the cumulative byte offset so
    // that token positions can be expressed relative to the original string.
    size_t global_offset = 0;
    std::istringstream stream(text);
    std::string line_text;

    while (std::getline(stream, line_text)) {
      parser->put_line(line_text.c_str());

      std::string tok;
      while (parser->next_token(tok)) {
        std::string word = parser->get_word(tok);
        if (word.empty()) continue;

        // get_tokenpos() returns the start of the raw token within the line.
        // The clean word may start a few characters later if the token had a
        // leading non-word prefix, so find the word's position within the tok.
        size_t tok_pos = parser->get_tokenpos();
        size_t word_in_tok = tok.find(word);
        size_t line_offset = tok_pos + (word_in_tok != std::string::npos ? word_in_tok : 0);

        results.push_back({word,
                           static_cast<int>(global_offset + line_offset),
                           static_cast<int>(word.size())});
      }

      // Advance by the line length plus the newline character consumed by
      // std::getline (not included in line_text).
      global_offset += line_text.size() + 1;
    }

    delete parser;
    return results;
  }

 private:
  Hunspell* hs_;
};

EMSCRIPTEN_BINDINGS(hunspell) {
  emscripten::value_object<TokenResult>("TokenResult")
    .field("word", &TokenResult::word)
    .field("offset", &TokenResult::offset)
    .field("length", &TokenResult::length);

  emscripten::register_vector<TokenResult>("TokenResultVector");

  emscripten::class_<HunspellChecker>("HunspellChecker")
    .constructor<std::string, std::string>()
    .function("spell", &HunspellChecker::spell)
    .function("suggest", &HunspellChecker::suggest)
    .function("addWord", &HunspellChecker::addWord)
    .function("tokenize", &HunspellChecker::tokenize);

  emscripten::register_vector<std::string>("StringVector");
}
