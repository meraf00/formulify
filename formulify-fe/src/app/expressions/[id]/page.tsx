'use client';

import { cacheKeys } from '@/api/api';
import { getExpression } from '@/api/expression.api';
import EvaluationForm from '@/features/formula/components/EvaluationForm';
import { Expression } from '@/lib/models/expression';

import { useQuery } from '@tanstack/react-query';
import { useParams, usePathname } from 'next/navigation';
import React from 'react';

export default function ExpressionPage() {
  const params = useParams();

  const expressionId = params.id as string;

  const { data: expression, isLoading } = useQuery<Expression>({
    queryKey: [cacheKeys.formulas, expressionId],
    queryFn: () => getExpression(expressionId ?? ''),
  });

  console.log(expression);

  return (
    <div className="p-5 w-full">
      {expression && <EvaluationForm expression={expression} />}
    </div>
  );
}
