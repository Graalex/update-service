/**
 * payment.js -- получить информацию о платежах
 */

const exp = require('express');
const util = require('util');
const conf = require('../config');
const fb = require('node-firebird');
const gz = require('../db/gazolina');

let router = exp.Router();

router.get('/:ls/:count', (req, res) => {
	let ls = req.params['ls'];
	let count = req.params['count'];

	// проверка параметров запроса
	if(util.isNullOrUndefined(ls) && ls <= 0) {
		res.json({
			status: 400,
			message: 'Не задан или недопустимый номер лицевого счета.'
		});
	}
	if(util.isNullOrUndefined(count) && ls <= 0) {
		// по умолчанию устанавливаем на 12 записей о показаниях счетчика
		count = 12;
	}

	let opt = conf.db.gazolina;
	let pool = fb.pool(2, opt);

	try {
		Promise.all([gz.getPayments(pool, ls, count)])
			.then(results => {
				res.json({
					status: 200,
					message: 'Успешное выполнение запроса.',
					content: results[0]
				});
			})
			.catch(err => {
				// или возвращаем ошибочный результат
				res.json(err);
			});
	}

	catch (err) {
		// возникла какая-то внутренняя ошибка
		res.json({
			status: 500,
			message: err.message
		});
	}

	finally {
		// очищаем пул подключений
		pool.destroy();
	}
});

module.exports = router;
