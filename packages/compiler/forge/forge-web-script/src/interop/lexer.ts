/**
 * Web IDL lexer for tokenizer operations across standard IDL specifications.
 */

export type WebIdlTokenKind = 'eof' | 'identifier' | 'number' | 'string' | 'symbol';

export interface WebIdlToken {
  readonly kind: WebIdlTokenKind;
  readonly text: string;
  readonly line: number;
  readonly column: number;
}

export class WebIdlLexer {
  private readonly source: string;
  private index = 0;
  private line = 1;
  private column = 1;

  public constructor(source: string) {
    this.source = source;
  }

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

  private isEof(): boolean {
    return this.index >= this.source.length;
  }

  private peek(offset = 0): string {
    return this.source[this.index + offset] ?? '';
  }

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

  private skipWhitespaceAndComments(): void {
    while (!this.isEof()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
        continue;
      }

      // Single-line comment: // ...
      if (char === '/' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        while (!this.isEof() && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Multi-line comment: /* ... */
      if (char === '/' && this.peek(1) === '*') {
        this.advance();
        this.advance();
        while (!this.isEof()) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance();
            this.advance();
            break;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

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
    if (this.isIdentifierStart(char)) {
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

  private isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isIdentifierPart(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      (char >= '0' && char <= '9') ||
      char === '_' ||
      char === '-'
    );
  }

  private isNumberStart(): boolean {
    const char = this.peek();
    if (char >= '0' && char <= '9') return true;
    if (char === '-' && this.peek(1) >= '0' && this.peek(1) <= '9') return true;
    return false;
  }

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

  private lexNumber(startLine: number, startColumn: number): WebIdlToken {
    let text = '';
    if (this.peek() === '-') {
      text += this.advance();
    }

    // Check hex
    if (this.peek() === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
      text += this.advance();
      text += this.advance();
      while (!this.isEof() && this.isHexDigit(this.peek())) {
        text += this.advance();
      }
      return {
        kind: 'number',
        text,
        line: startLine,
        column: startColumn,
      };
    }

    while (!this.isEof() && this.peek() >= '0' && this.peek() <= '9') {
      text += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.peek(1) >= '0' && this.peek(1) <= '9') {
      text += this.advance();
      while (!this.isEof() && this.peek() >= '0' && this.peek() <= '9') {
        text += this.advance();
      }
    }

    // Exponential part
    if (this.peek() === 'e' || this.peek() === 'E') {
      text += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        text += this.advance();
      }
      while (!this.isEof() && this.peek() >= '0' && this.peek() <= '9') {
        text += this.advance();
      }
    }

    return {
      kind: 'number',
      text,
      line: startLine,
      column: startColumn,
    };
  }

  private isHexDigit(char: string): boolean {
    return (char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
  }

  private lexIdentifier(startLine: number, startColumn: number): WebIdlToken {
    let text = '';
    while (!this.isEof() && this.isIdentifierPart(this.peek())) {
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

export function lexWebIdl(source: string): readonly WebIdlToken[] {
  return new WebIdlLexer(source).tokenize();
}
