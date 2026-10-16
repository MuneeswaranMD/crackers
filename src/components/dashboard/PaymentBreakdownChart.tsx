'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatINR } from '@/lib/calculations';

interface PaymentBreakdownChartProps {
  data: { name: string; value: number; color: string }[];
}

export default function PaymentBreakdownChart({ data }: PaymentBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No payment data for selected period
      </div>
    );
  }

  return (
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={65}
            innerRadius={40}
            paddingAngle={4}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatINR(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
