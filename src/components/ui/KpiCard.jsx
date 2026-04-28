// src/components/ui/KpiCard.jsx
export default function KpiCard({ title, value, meta, equation, colorTheme }) {
  const themes = {
    blue: 'border-blue-200 bg-blue-50/20 text-blue-700 label-blue-600',
    teal: 'border-teal-200 bg-teal-50/20 text-teal-700 label-teal-600',
    orange: 'border-orange-200 bg-orange-50/20 text-orange-700 label-orange-600',
    indigo: 'border-indigo-200 bg-indigo-50/20 text-indigo-700 label-indigo-600',
    gray: 'border-slate-200 bg-slate-50/20 text-slate-700 label-slate-600',
  };

  const themeClasses = themes[colorTheme] || themes.gray;
  const [borderColor, bgColor, textColor, labelColor] = themeClasses.split(' ');

  return (
    <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${bgColor} ${borderColor} h-full`}>
      <div>
        <p className={`text-[10px] font-bold uppercase ${labelColor.replace('label-', 'text-')}`}>{title}</p>
        <p className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</p>
      </div>
      <div className={`mt-3 pt-3 border-t ${borderColor}`}>
        <p className={`text-[9px] font-bold mb-0.5 ${textColor}`}>{meta}</p>
        <p className={`text-[8px] leading-tight text-slate-500`}>{equation}</p>
      </div>
    </div>
  );
}