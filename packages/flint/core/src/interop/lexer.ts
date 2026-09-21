/**
 * Web IDL lexer for tokenizer operations across standard IDL specifications.
 */

/** Classification of a single lexed Web IDL token. */
export type WebIdlTokenKind = 'eof' | 'identifier' | 'number' | 'string' | 'symbol';

/** A single lexed Web IDL token with its source position. */
export interface WebIdlToken {
  readonly kind: WebIdlTokenKind;
  readonly text: string;
  readonly line: number;
  readonly column: number;
}

/** Hand-written scanner that tokenizes Web IDL source text into a flat token stream. */
export class WebIdlLexer {
  private readonly source: string;
  private index = 0;
  private line = 1;
  private column = 1;

  /**
   * Creates a lexer bound to the given Web IDL source text.
   *
   * @param source - Complete Web IDL source to tokenize.
   */
  public constructor(source: string) {
    this.source = source;
  }

  /**
   * Scans the entire source into a token stream terminated by an `eof` token.
   *
   * @returns The ordered list of lexed tokens, including a trailing `eof` token.
   */
  public tokenize(): readonly WebIdlToken[] {
    const tokens: WebIdlToken[] = [];
    while (!this.isEof()) {
      this.skipWhitespaceAndComments();
      if (this.isEof()) break;

      const token = this.nextToken();
      if (token !== undefined) {
        tokens.push(token);
      }
    }

    tokens.push({
      kind: 'eof',
      text: '',
      line: this.line,
      column: this.column,
    });

    return tokens;
  }

  /**
   * Reports whether the scan cursor has reached the end of the source.
   *
   * @returns `true` when no more characters remain.
   */
  private isEof(): boolean {
    return this.index >= this.source.length;
  }

  /**
   * Looks ahead at a character without consuming it.
   *
   * @param offset - Number of characters ahead of the current cursor to inspect.
   * @returns The character at the offset, or an empty string past the end of the source.
   */
  private peek(offset = 0): string {
    return this.source[this.index + offset] ?? '';
  }

  /**
   * Consumes and returns the current character, updating line/column tracking.
   *
   * @returns The consumed character, or an empty string past the end of the source.
   */
  private advance(): string {
    const char = this.source[this.index] ?? '';
    this.index += 1;
    if (char === '\n') {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return char;
  }

  /**
   * Reports whether the character at the cursor is an ASCII whitespace character.
   *
   * @returns `true` when the current character should be skipped as whitespace.
   */
  private isWhitespaceChar(): boolean {
    const char = this.peek();
    return char === ' ' || char === '\t' || char === '\r' || char === '\n';
  }

  /**
   * Reports whether the cursor is positioned at the start of a `//` line comment.
   *
   * @returns `true` when a single-line comment starts at the cursor.
   */
  private isLineCommentStart(): boolean {
    return this.peek() === '/' && this.peek(1) === '/';
  }

  /**
   * Reports whether the cursor is positioned at the start of a `/* ... *\/` block comment.
   *
   * @returns `true` when a multi-line comment starts at the cursor.
   */
  private isBlockCommentStart(): boolean {
    return this.peek() === '/' && this.peek(1) === '*';
  }

  /**
   * Consumes a `//` line comment up to (but not including) the terminating newline.
   */
  private skipLineComment(): void {
    this.advance();
    this.advance();
    while (!this.isEof() && this.peek() !== '\n') {
      this.advance();
    }
  }

  /**
   * Consumes a `/* ... *\/` block comment, including its closing delimiter.
   */
  private skipBlockComment(): void {
    this.advance();
    this.advance();
    while (!this.isEof()) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        return;
      }
      this.advance();
    }
  }

  /**
   * Advances the cursor past any run of whitespace and line/block comments.
   */
  private skipWhitespaceAndComments(): void {
    while (!this.isEof()) {
      if (this.isWhitespaceChar()) {
        this.advance();
        continue;
      }

      if (this.isLineCommentStart()) {
        this.skipLineComment();
        continue;
      }

      if (this.isBlockCommentStart()) {
        this.skipBlockComment();
        continue;
      }

      break;
    }
  }

  /**
   * Scans a single token starting at the current cursor position.
   *
   * @returns The next lexed token, or `undefined` if none could be produced.
   */
  // skipcq: JS-R1005
  private nextToken(): WebIdlToken | undefined {
    const startLine = this.line;
    const startColumn = this.column;
    const char = this.peek();

    // String literal: "..."
    if (char === '"') {
      return this.lexString(startLine, startColumn);
    }

    // Number literal (or negative number): -?[0-9]... or -?Infinity / NaN
    if (this.isNumberStart()) {
      return this.lexNumber(startLine, startColumn);
    }

    // Identifiers and keywords (including extended attributes or escaped identifiers like _attribute)
    // skipcq: JS-0105
    if (WebIdlLexer.isIdentifierStart(char)) {
      return this.lexIdentifier(startLine, startColumn);
    }

    // Multi-char symbols: ...
    if (char === '.' && this.peek(1) === '.' && this.peek(2) === '.') {
      this.advance();
      this.advance();
      this.advance();
      return {
        kind: 'symbol',
        text: '...',
        line: startLine,
        column: startColumn,
      };
    }

    // Single-char symbols: ( ) { } [ ] < > , ; : = ? -
    const singleCharSymbols = new Set(['(', ')', '{', '}', '[', ']', '<', '>', ',', ';', ':', '=', '?', '-']);
    if (singleCharSymbols.has(char)) {
      this.advance();
      return {
        kind: 'symbol',
        text: char,
        line: startLine,
        column: startColumn,
      };
    }

    // Unknown char, advance to avoid infinite loop
    this.advance();
    return {
      kind: 'symbol',
      text: char,
      line: startLine,
      column: startColumn,
    };
  }

  /**
   * Reports whether a character may begin an identifier.
   *
   * @param char - Candidate character.
   * @returns `true` when the character is a letter or underscore.
   */
  private static isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  /**
   * Reports whether a character may continue an identifier.
   *
   * @param char - Candidate character.
   * @returns `true` when the character is a letter, digit, underscore, or hyphen.
   */
  private static isIdentifierPart(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      (char >= '0' && char <= '9') ||
      char === '_' ||
      char === '-'
    );
  }

  /**
   * Reports whether the cursor is positioned at the start of a numeric literal.
   *
   * @returns `true` when the current (and possibly next) character begin a number.
   */
  private isNumberStart(): boolean {
    const char = this.peek();
    return (char >= '0' && char <= '9') || (char === '-' && this.peek(1) >= '0' && this.peek(1) <= '9');
  }

  /**
   * Scans a double-quoted string literal, interpreting `\n`, `\r`, and `\t` escapes.
   *
   * @param startLine - Line number at which the string literal begins.
   * @param startColumn - Column number at which the string literal begins.
   * @returns The lexed string token.
   */
  // skipcq: JS-R1005
  private lexString(startLine: number, startColumn: number): WebIdlToken {
    this.advance(); // consume opening quote
    let value = '';
    while (!this.isEof()) {
      const char = this.advance();
      if (char === '"') break;
      if (char === '\\' && !this.isEof()) {
        const next = this.advance();
        switch (next) {
          case 'n': {
            value += '\n';
            break;
          }
          case 'r': {
            value += '\r';
            break;
          }
          case 't': {
            value += '\t';
            break;
          }
          default: {
            value += next;
          }
        }
      } else {
        value += char;
      }
    }

    return {
      kind: 'string',
      text: value,
      line: startLine,
      column: startColumn,
    };
  }

  /**
   * Reports whether a character is a hexadecimal digit.
   *
   * @param char - Candidate character.
   * @returns `true` when the character is `0`-`9`, `a`-`f`, or `A`-`F`.
   */
  private static isHexDigit(char: string): boolean {
    return (char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
  }

  /**
   * Consumes an optional leading minus sign for a numeric literal.
   *
   * @returns The consumed sign text, or an empty string when absent.
   */
  private lexNumberSign(): string {
    return this.peek() === '-' ? this.advance() : '';
  }

  /**
   * Reports whether the cursor is positioned at a `0x`/`0X` hexadecimal prefix.
   *
   * @returns `true` when a hexadecimal literal starts at the cursor.
   */
  private isHexNumberStart(): boolean {
    return this.peek() === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X');
  }

  /**
   * Consumes a `0x`/`0X`-prefixed hexadecimal literal body.
   *
   * @returns The lexed hexadecimal digits, including the `0x` prefix.
   */
  private lexHexDigits(): string {
    let text = this.advance() + this.advance();
    // skipcq: JS-0105, JS-R1005
    while (!this.isEof() && WebIdlLexer.isHexDigit(this.peek())) {
      text += this.advance();
    }
    return text;
  }

  /**
   * Consumes a run of ASCII decimal digits.
   *
   * @returns The consumed digit text, which may be empty.
   */
  private lexDigits(): string {
    let text = '';
    while (!this.isEof() && this.peek() >= '0' && this.peek() <= '9') {
      text += this.advance();
    }
    return text;
  }

  /**
   * Consumes an optional decimal fraction part (`.digits`) of a numeric literal.
   *
   * @returns The consumed fraction text, or an empty string when absent.
   */
  private lexDecimalPart(): string {
    if (this.peek() === '.' && this.peek(1) >= '0' && this.peek(1) <= '9') {
      return this.advance() + this.lexDigits();
    }
    return '';
  }

  /**
   * Consumes an optional exponent part (`e`/`E` followed by an optional sign and digits).
   *
   * @returns The consumed exponent text, or an empty string when absent.
   */
  private lexExponentPart(): string {
    if (this.peek() !== 'e' && this.peek() !== 'E') return '';
    let text = this.advance();
    if (this.peek() === '+' || this.peek() === '-') {
      text += this.advance();
    }
    return text + this.lexDigits();
  }

  /**
   * Scans a numeric literal, including optional sign, hexadecimal, decimal, and exponent forms.
   *
   * @param startLine - Line number at which the numeric literal begins.
   * @param startColumn - Column number at which the numeric literal begins.
   * @returns The lexed number token.
   */
  private lexNumber(startLine: number, startColumn: number): WebIdlToken {
    const sign = this.lexNumberSign();

    if (this.isHexNumberStart()) {
      return {
        kind: 'number',
        text: sign + this.lexHexDigits(),
        line: startLine,
        column: startColumn,
      };
    }

    const text = sign + this.lexDigits() + this.lexDecimalPart() + this.lexExponentPart();

    return {
      kind: 'number',
      text,
      line: startLine,
      column: startColumn,
    };
  }

  /**
   * Scans an identifier or keyword, unescaping a leading `_` used to avoid keyword collisions.
   *
   * @param startLine - Line number at which the identifier begins.
   * @param startColumn - Column number at which the identifier begins.
   * @returns The lexed identifier token.
   */
  private lexIdentifier(startLine: number, startColumn: number): WebIdlToken {
    let text = '';
    while (!this.isEof() && WebIdlLexer.isIdentifierPart(this.peek())) {
      text += this.advance();
    }

    // In Web IDL, leading '_' is used to escape identifiers that collide with keywords (e.g. `_attribute`)
    if (text.startsWith('_')) {
      text = text.slice(1);
    }

    return {
      kind: 'identifier',
      text,
      line: startLine,
      column: startColumn,
    };
  }
}

/**
 * Tokenizes a complete Web IDL source string.
 *
 * @param source - Web IDL source text to lex.
 * @returns The ordered list of lexed tokens, including a trailing `eof` token.
 */
export function lexWebIdl(source: string): readonly WebIdlToken[] {
  return new WebIdlLexer(source).tokenize();
}
