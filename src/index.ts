export interface TsPackageTemplateProps {
  input: number;
  multiplicand: number;
}

export const packageTemplateFunction = ({
  input,
  multiplicand,
}: TsPackageTemplateProps) => {
  return input * multiplicand;
};

export default packageTemplateFunction;
