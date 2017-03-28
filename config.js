/**
 * config.js -- конфигурация приложения
 */

module.exports = {
	db: {
		gazolina: {
			host: '192.168.0.69',
			port: 3050,
			database: 'C:/database/mariupol.fdb',
			user: 'SYSDBA',
			password: 'masterkey',
			lowercase_keys: false,
			role: null,
			pageSize: 4096
		}
	},
	security: {},
	server: {
		listenPort: 10000,
		securePort: 10433
	}
};
