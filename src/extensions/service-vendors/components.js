import log from "../../server/log";

export const getServiceVendorComponent = serviceName => {
  try {
    // eslint-disable-next-line global-require
    const component = require(`./${serviceName}/react-component.js`);
    return component;
  } catch (caught) {
    log.error({
      category: 'extension',
      err: caught,
    }, `SERVICE_VENDOR failed to load react component for ${serviceName}`);
    return null;
  }
};
