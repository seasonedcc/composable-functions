# Use composable-functions with a custom parser

This simple example can be a reference to adapt composable-functions to any other parser library.

There are two approaches to use composable-functions with a custom parser:
- Create an adapter function that will receive a schema and return a schema in the shape of a `ParserSchena`. Example: [the `adapt` function](./src/adapters.ts).
- Create your custom `withSchema` and `applySchema` that will validate your input and environment and return a `Result`. Example: [the `withArkSchema` and `applyArkSchema` functions](./src/adapters.ts).

Check out the [`./src`](./src/) directory to understand how we implemented both approaches with [`arktype`](https://github.com/arktypeio/arktype).
