#include <emscripten/bind.h>
#include <hunspell/hunspell.hxx>
#include <string>
#include <vector>

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

 private:
  Hunspell* hs_;
};

EMSCRIPTEN_BINDINGS(hunspell) {
  emscripten::class_<HunspellChecker>("HunspellChecker")
    .constructor<std::string, std::string>()
    .function("spell", &HunspellChecker::spell)
    .function("suggest", &HunspellChecker::suggest)
    .function("addWord", &HunspellChecker::addWord);

  emscripten::register_vector<std::string>("StringVector");
}
