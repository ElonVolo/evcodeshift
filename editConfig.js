function transformer(file, api, options) {
  const j = api.jscodeshift;

  const root = j(file.source);

  return j(file.source)
    .find(j.Property, {
      type: "Property",
      key: {
        type: "Identifier",
        name: "someProperty",
      },
    })
    .replaceWith((p) => {
      return j.property("init", p.value.key, j.literal("success"));
    })
    .toSource();
}

module.exports = transformer;
