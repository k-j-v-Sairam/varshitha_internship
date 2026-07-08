module.exports = (path, options) => {
  return options.defaultResolver(path, {
    ...options,
    packageFilter: pkg => {
      if (pkg.name && (pkg.name.startsWith('@firebase') || pkg.name === 'firebase')) {
        delete pkg['react-native'];
        delete pkg['browser'];
      }
      return pkg;
    },
  });
};
