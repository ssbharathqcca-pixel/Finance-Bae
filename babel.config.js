module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Safety net: rewrite import.meta so classic script bundles don't crash.
      // Needed for packages (e.g. zustand ESM) that use import.meta.env.
      function importMetaBabelPlugin({ types: t }) {
        return {
          name: 'transform-import-meta',
          visitor: {
            MetaProperty(path) {
              if (
                path.node.meta &&
                path.node.meta.name === 'import' &&
                path.node.property &&
                path.node.property.name === 'meta'
              ) {
                path.replaceWith(
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier('env'),
                      t.objectExpression([
                        t.objectProperty(
                          t.identifier('MODE'),
                          t.logicalExpression(
                            '||',
                            t.memberExpression(
                              t.memberExpression(t.identifier('process'), t.identifier('env')),
                              t.identifier('NODE_ENV')
                            ),
                            t.stringLiteral('development')
                          )
                        ),
                      ])
                    ),
                    t.objectProperty(t.identifier('url'), t.stringLiteral('')),
                  ])
                );
              }
            },
          },
        };
      },
      // Must be last
      'react-native-reanimated/plugin',
    ],
  };
};
