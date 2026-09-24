export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1.5 text-xs font-medium text-rose-600">{errors[0]}</p>;
}
