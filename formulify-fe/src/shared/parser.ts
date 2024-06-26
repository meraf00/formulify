export const validateIdentifierName = (name: string) => {
  return name.match(/^[a-zA-Z_]+[a-zA-Z0-9]*$/i);
};

enum TokenType {
  EOF = 'EOF',
  IDENT = 'IDENT',
  NUMBER = 'NUMBER',
  PLUS = '+',
  MINUS = '-',
  ASTERISK = '*',
  LPAREN = '(',
  RPAREN = ')',
}

class Token {
  constructor(public type: TokenType, public literal: string) {}
}

export class Expression {
  constructor(public name: string, public formula: string) {}
}

class Lexer {
  private position: number; // current position
  private readPosition: number; // next position to read
  private currentChar: string;

  constructor(private formula: string) {
    this.position = -1;
    this.readPosition = 0;
    this.currentChar = '';
    this.readChar();
  }

  peekChar() {
    if (this.readPosition >= this.formula.length) {
      return '';
    } else {
      return this.formula[this.readPosition];
    }
  }

  readChar() {
    if (this.readPosition >= this.formula.length) {
      this.currentChar = '';
    } else {
      this.currentChar = this.formula[this.readPosition];
    }

    this.position = this.readPosition;
    this.readPosition += 1;
  }

  skipWhitespace() {
    while (this.currentChar === ' ') {
      this.readChar();
    }
  }

  readIdentifier() {
    const position = this.position;

    if (this.currentChar.match(/[_a-zA-Z]/)) {
      this.readChar();
    }

    while (this.currentChar.match(/[_a-zA-Z0-9]/)) {
      this.readChar();
    }

    return new Token(
      TokenType.IDENT,
      this.formula.slice(position, this.position)
    );
  }

  readNumber() {
    const position = this.position;
    while (this.currentChar.match(/[0-9]/)) {
      this.readChar();
    }

    if (this.currentChar == '.') {
      this.readChar();

      while (this.currentChar.match(/[0-9]/)) {
        this.readChar();
      }
    }

    return new Token(
      TokenType.NUMBER,
      this.formula.slice(position, this.position)
    );
  }

  nextToken() {
    let token: Token;

    this.skipWhitespace();

    switch (this.currentChar) {
      case '+':
        token = new Token(TokenType.PLUS, this.currentChar);
        break;
      case '-':
        token = new Token(TokenType.MINUS, this.currentChar);
        break;
      case '*':
        token = new Token(TokenType.ASTERISK, this.currentChar);
        break;
      case '(':
        token = new Token(TokenType.LPAREN, this.currentChar);
        break;
      case ')':
        token = new Token(TokenType.RPAREN, this.currentChar);
        break;
      default:
        if (this.currentChar === '') {
          return new Token(TokenType.EOF, this.currentChar);
        } else if (this.currentChar.match(/[_a-zA-Z]/)) {
          return this.readIdentifier();
        } else if (this.currentChar.match(/[0-9]/)) {
          return this.readNumber();
        } else {
          throw new Error(`Invalid character: ${this.currentChar}`);
        }
    }

    this.readChar();

    return token;
  }
}

export class Parser {
  constructor(
    private expression: Expression,
    private expressionsMap: Record<string, Expression>
  ) {}

  private _tokenize(): Token[] {
    const lexer = new Lexer(this.expression.formula);
    const tokens = [];
    let token: Token = new Token(TokenType.IDENT, '');
    while (token.type != TokenType.EOF) {
      token = lexer.nextToken();
      tokens.push(token);
    }
    tokens.pop();
    return tokens;
  }

  private _evaluatePostfix(queue: Token[]) {
    const stack: number[] = [];

    for (const token of queue) {
      if (token.type === TokenType.NUMBER) {
        stack.push(parseFloat(token.literal));
      } else {
        if (stack.length < 2) {
          throw new Error('Invalid expression');
        }

        const b = stack.pop()!;
        const a = stack.pop()!;

        if (token.type === TokenType.PLUS) {
          stack.push(a + b);
        } else if (token.type === TokenType.MINUS) {
          stack.push(a - b);
        } else if (token.type === TokenType.ASTERISK) {
          stack.push(a * b);
        }
      }
    }

    if (stack.length !== 1) {
      throw new Error('Invalid expression');
    }

    return stack.pop();
  }

  private _evaluateIdentifier(
    identifier: string,
    context: Record<string, number>
  ) {
    const evaluated = new Parser(
      this.expressionsMap[identifier],
      this.expressionsMap
    ).evaluate(context);

    if (!evaluated) throw new Error(`Expression ${identifier} is not found`);

    return evaluated;
  }

  getDependencies(exp: Expression) {
    if (exp.name === exp.formula) return [];
    const tokens = new Parser(exp, this.expressionsMap)._tokenize();
    const dependencies = new Set<string>();

    for (const token of tokens) {
      if (token.type === TokenType.IDENT) {
        dependencies.add(token.literal);
        this.getDependencies(this.expressionsMap[token.literal]).forEach(
          (dep) => dependencies.add(dep)
        );
      }
    }

    return Array.from(dependencies);
  }

  validate(): string | null {
    try {
      const deps = this.getDependencies(this.expression);

      const context: Record<string, number> = {};
      for (const dep of deps) {
        if (this.expressionsMap[dep] === undefined) {
          return `Unknown name "${dep}"`;
        }

        if (
          this.expressionsMap[dep].name === this.expressionsMap[dep].formula
        ) {
          context[dep] = 1;
        }
      }
      this.evaluate(context);
      return null;
    } catch (e: any) {
      return e.message;
    }
  }

  evaluate(context: Record<string, number>) {
    const operators = [TokenType.PLUS, TokenType.MINUS, TokenType.ASTERISK];

    const tokens = this._tokenize();

    const queue: Token[] = [];
    const operatorStack = [];

    const precedence: { [key: string]: number } = {
      [TokenType.PLUS]: 1,
      [TokenType.MINUS]: 1,
      [TokenType.ASTERISK]: 2,
    };

    for (const token of tokens) {
      // if token is a number
      if (token.type === TokenType.IDENT) {
        if (context[token.literal] !== undefined) {
          queue.push(new Token(TokenType.NUMBER, `${context[token.literal]}`));
        } else if (this.expressionsMap[token.literal] !== undefined) {
          queue.push(
            new Token(
              TokenType.NUMBER,
              this._evaluateIdentifier(token.literal, context).toString()
            )
          );
        } else {
          throw new Error(`Unknown name "${token.literal}"`);
        }
      } else if (token.type === TokenType.NUMBER) {
        queue.push(token);
      }

      // if token is an operator
      else if (operators.includes(token.type)) {
        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];

          // check if it is not parenthesis
          if (operators.includes(top.type)) {
            // check for greater precedence
            if (precedence[top.literal] >= precedence[token.literal]) {
              queue.push(operatorStack.pop()!);
            } else {
              break;
            }
          } else {
            break;
          }
        }

        operatorStack.push(token);
      }

      // if token is left parenthesis
      else if (token.type === TokenType.LPAREN) {
        operatorStack.push(token);
      }

      // if token is right parenthesis
      else if (token.type === TokenType.RPAREN) {
        while (operatorStack.length > 0) {
          const top: Token = operatorStack.pop()!;

          if (top.type === TokenType.LPAREN) {
            break;
          } else {
            queue.push(top);
          }
        }
      }
    }

    while (operatorStack.length > 0) {
      queue.push(operatorStack.pop()!);
    }

    return this._evaluatePostfix(queue);
  }
}

export const test = () => {
  const l = new Lexer('(a + b * 123) + 3 + 0.3');

  const tokens = [];

  let token: Token = new Token(TokenType.IDENT, '');
  while (token.type != TokenType.EOF) {
    token = l.nextToken();
    tokens.push(token);
  }

  const a = new Expression('a', 'a');
  const b = new Expression('b', 'b');

  const c = new Expression('c', 'a + b');
  const d = new Expression('d', '1 + c - a * 2 ');

  const p = new Parser(d, { a, b, c, d });
  console.log(p.evaluate({ a: 1, b: 2 }));
  // console.log(p.evaluate({ a: 1, b: 2 }));
  console.log(p.validate());
};
