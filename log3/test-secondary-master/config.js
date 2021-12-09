var config_env = {
    development: {
    },
    default: {
    }
};

const config = process.env.NODE_ENV ? config_env[process.env.NODE_ENV] : config_env.default;
module.exports = config;
