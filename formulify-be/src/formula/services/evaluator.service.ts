import { Injectable } from '@nestjs/common';
import { Lexer, Token, TokenType } from './parser';

@Injectable()
export class EvaluatorService {
  tokenizer(expression: string): Token[] {
    const lexer = new Lexer(expression);
    const tokens: Token[] = [];
    let token: Token = new Token(TokenType.IDENT, '');
    while (token.type != TokenType.EOF) {
      token = lexer.nextToken();
      tokens.push(token);
    }
    tokens.pop();
    return tokens;
  }

  postfixEvaluator(tokens: Token[]) {
    const stack: number[] = [];

    for (const token of tokens) {
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

  shuntingYardParser(
    tokens: Token[],
    variableValues: Record<string, number>,
    formulaSet: Record<string, string>,
    independentVariables: string[],
  ) {
    const operators = [TokenType.PLUS, TokenType.MINUS, TokenType.ASTERISK];

    const queue: Token[] = [];
    const operatorStack = [];

    const precedence: { [key: string]: number } = {
      [TokenType.PLUS]: 1,
      [TokenType.MINUS]: 1,
      [TokenType.ASTERISK]: 2,
    };

    for (const token of tokens) {
      // if token is a number literal or it's value can be found in variableValues
      if (token.type === TokenType.IDENT) {
        // if value is found in formulaSet, evaluate the formula and push the result
        if (formulaSet[token.literal] !== undefined) {
          // if variable is independent variable and
          // if value is found in variableValues, resolve it to the passed number
          if (
            independentVariables.includes(token.literal) &&
            variableValues[token.literal] !== undefined
          ) {
            queue.push(
              new Token(TokenType.NUMBER, `${variableValues[token.literal]}`),
            );
          } else {
            const value = this.evaluate(
              formulaSet[token.literal],
              variableValues,
              formulaSet,
            );
            queue.push(new Token(TokenType.NUMBER, value.toString()));
          }
        }

        // the identifier is neither number nor formula in the formulaSet, thus we can't resolve it
        else {
          throw new Error(`Unknown name "${token.literal}" found in formula.`);
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

    return queue;
  }

  evaluate(
    expression: string,
    variableValues: Record<string, number>,
    formulaSet: Record<string, string>,
  ): number {
    const tokens = this.tokenizer(expression);

    const postfix = this.shuntingYardParser(
      tokens,
      variableValues,
      formulaSet,
      this.independentVariables(this.dependencyGraph(formulaSet)),
    );
    return this.postfixEvaluator(postfix);
  }

  dependencyGraph(formulaSet: Record<string, string>) {
    const graph = {};

    for (const key in formulaSet) {
      graph[key] = new Set();
    }

    for (const key in formulaSet) {
      const tokens = this.tokenizer(formulaSet[key]);

      for (const token of tokens) {
        if (token.type === TokenType.IDENT) {
          if (graph[token.literal] === undefined) {
            graph[token.literal] = new Set([key]);
          } else {
            graph[token.literal].add(key);
          }
        }
      }
    }

    return graph;
  }

  independentVariables(graph: Record<string, Set<string>>) {
    const inDegrees = {};

    for (const key in graph) {
      inDegrees[key] = 0;
    }

    for (const key in graph) {
      for (const nbr of Array.from(graph[key])) {
        inDegrees[nbr] += 1;
      }
    }

    const queue: string[] = [];

    for (const key in inDegrees) {
      if (inDegrees[key] === 0) {
        queue.push(key);
      }
    }

    return queue;
  }

  hasCycle(graph: Record<string, Set<string>>) {
    const inDegrees = {};

    for (const key in graph) {
      inDegrees[key] = 0;
    }

    for (const key in graph) {
      for (const nbr of Array.from(graph[key])) {
        inDegrees[nbr] += 1;
      }
    }

    const queue: string[] = [];

    for (const key in inDegrees) {
      if (inDegrees[key] === 0) {
        queue.push(key);
      }
    }

    const order = [];

    while (queue.length > 0) {
      const node = queue.shift()!;

      order.push(node);

      for (const neighbor of graph[node]) {
        inDegrees[neighbor] -= 1;

        if (inDegrees[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }

    return order.length !== Object.keys(graph).length;
  }

  validate(formulaSet: Record<string, string>) {
    const graph = this.dependencyGraph(formulaSet);

    for (const key in graph) {
      if (formulaSet[key] === undefined) {
        throw new Error(`Unknown name "${key}" found in formula.`);
      }
    }

    if (this.hasCycle(graph)) {
      throw new Error('Cyclic dependency detected');
    }
  }
}
