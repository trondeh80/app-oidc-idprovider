const xpHome = Java.type('java.lang.System').getenv('XP_HOME');
const Properties = Java.type('java.util.Properties');
const FileInputStream = Java.type('java.io.FileInputStream');

const fileName = 'no.bouvet.dynamics.properties';

let config = null;
export default function getConfiguration() {
    if (config === null) {
        const fis = new FileInputStream(`${xpHome}/config/${fileName}`);
        const prop = new Properties();
        prop.load(fis);
        fis.close();
        config = prop;
    }
    return config;
}

export function getConfigValue(key) {
    return getConfiguration()[key];
}
