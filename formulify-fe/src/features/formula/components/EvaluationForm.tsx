'use client';

import { notifications } from '@mantine/notifications';
import { Button, TextInput } from '@mantine/core';

import { Expression as ParserExpression, Parser } from '@/shared/parser';
import { Expression } from '@/lib/models/expression';
import { cacheKeys } from '@/api/api';
import { evaluateExpression, getExpressions } from '@/api/expression.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export interface EvaluationFormProps {
  expression: Expression;
}

export default function EvaluationForm({ expression }: EvaluationFormProps) {
  const { data: expressions } = useQuery<Expression[]>({
    queryKey: [cacheKeys.formulas],
    queryFn: getExpressions,
  });

  const evaluateHandler = useMutation({
    mutationFn: evaluateExpression,
    onSuccess: (data) => {
      setResult(data.toString());
    },
    onError: (error) => {
      notifications.show({
        title: 'Evaluation failed',
        message: error.message,
        color: 'red',
      });
    },
  });

  const map: Record<string, Expression> = {};

  expressions?.forEach((e) => {
    map[e.name] = e;
  });

  let parser: Parser | null = null;
  if (expressions) parser = new Parser(expression, map);

  const deps = parser
    ?.getDependencies(expression)
    .map((dep) => expressions?.find((e) => e.name === dep)!);

  const [vars, setVars] = useState<number[]>(Array(deps?.length).fill(0));
  const [result, setResult] = useState<string>('0');

  const evaluate = () => {
    const kv: { [key: string]: number } = {};

    deps?.forEach((e: Expression, i) => {
      kv[e.name] = vars[i];
    });

    console.log(kv);

    evaluateHandler.mutate({
      formulaId: expression.id,
      variables: kv,
    });
  };

  const inputs = deps?.map((exp, i) => {
    return (
      <TextInput
        value={vars[i] ?? 0}
        onChange={(e) =>
          setVars((vars) => [
            ...vars.slice(0, i),
            parseFloat(e.target.value ?? '0'),
            ...vars.slice(i + 1),
          ])
        }
        key={exp.id}
        label={exp.name}
        placeholder={exp.name}
        type="number"
        required
      />
    );
  });

  return (
    <div className="flex flex-col gap-5 w-1/3">
      <h2 className="text-xl font-semibold">Evaluate {expression?.name}</h2>
      <div>{inputs}</div>

      <div>
        <Button onClick={evaluate}>Evaluate</Button>
      </div>

      <div>
        Result: <span className="text-green">{result}</span>
      </div>
    </div>
  );
}
