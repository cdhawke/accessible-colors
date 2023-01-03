# accessible-colors

Typescript template for creating and publishing with rollup, typescript, jest, eslint, prettier, and husky

## Usage

Replace all instances of `accessible-colors` with the name of your actual npm package.

## React

Run the following:

```sh
yarn add -D eslint-plugin-react-hooks eslint-plugin-react @types/react @testing-library/react-hooks @testing-library/react
```

Replace the following sections in `.eslintrc.json`:

```json
{
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["react", "@typescript-eslint"]
}
```

And then to `tsconfig.json`, add the following line:

```json
{
  "jsx": "react-jsx"
}
```

## Jest

If publishing for a web app, you may need the `jsdom` `testEnvironment` in the `jest.config.js`
See https://jestjs.io/docs/configuration#testenvironment-string

## Publishing

Just run `npm publish`, which should build the package with rollup, increment the version, and publish the results.
