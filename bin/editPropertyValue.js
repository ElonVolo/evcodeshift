function transformer(file, api, options) {
  const keyValue = options.keyValue;

  if (
    !keyValue ||
    !keyValue.hasOwnProperty('key') ||
    !keyValue.hasOwnProperty('value')
  ) {
    // TODO: handle missing keyValue property in options
    return file.source;
  }

  const propertyName = keyValue.key;
  const propertyValue = keyValue.value;

  let parsedPropertyValue = propertyValue;
  try {
    parsedPropertyValue = JSON.parse(propertyValue);
  } catch (e) {
    // TODO: handle JSON parsing error
  }

  const j = api.jscodeshift;

  return j(file.source)
    .find(j.Property, {
      type: 'Property',
      key: {
        type: 'Identifier',
        name: propertyName,
      },
    })
    .replaceWith((p) => {
      if (typeof parsedPropertyValue !== 'object') {
        return j.property('init', p.value.key, j.literal(parsedPropertyValue));
      } else if (Array.isArray(parsedPropertyValue)) {
        return j.property(
          'init',
          p.value.key,
          j.arrayExpression(
            parsedPropertyValue.map((element) => j.literal(element))
          )
        );
      } else {
        return j.property(
          'init',
          p.value.key,
          j.objectExpression(
            Object.keys(parsedPropertyValue).map((key) => {
              return j.property(
                'init',
                j.identifier(key),
                j.literal(parsedPropertyValue[key])
              );
            })
          )
        );
      }
    })
    .toSource();
}

module.exports = transformer;
