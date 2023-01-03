import packageTemplateFunction, { TsPackageTemplateProps } from '..';

const props: TsPackageTemplateProps = { input: 1, multiplicand: 2 };

describe('TS Package Template', () => {
  it('succeeds', () => {
    const result = packageTemplateFunction(props);
    expect(result).toEqual(2);
  });
});
