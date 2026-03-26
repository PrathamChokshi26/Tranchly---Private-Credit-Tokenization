import React from 'react';

const gradeStyles = {
  A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B: 'bg-teal-100 text-teal-700 border-teal-200',
  C: 'bg-amber-100 text-amber-700 border-amber-200',
  Reject: 'bg-red-100 text-red-700 border-red-200',
};

export default function GradeBadge({ grade, size = 'md' }) {
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-base' : size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
  return (
    <span className={`inline-flex items-center font-bold rounded-md border ${gradeStyles[grade] || gradeStyles.Reject} ${sizeClasses}`}>
      {grade === 'Reject' ? 'REJ' : `Grade ${grade}`}
    </span>
  );
}
