/**
 * acount.js -- получить общую информацию о лицевом счете абонента.
 */

const exp = require('express');
const util = require('util');
const conf = require('../config');
const fb = require('node-firebird');
const gz = require('../db/gazolina');

let router = exp.Router();

router.get('/:ls', (req, res) => {
	let ls = req.params['ls'];

	// проверка параметров запроса
	if(util.isNullOrUndefined(ls) && ls <= 0) {
		res.json({
			status: 400,
			message: 'Не задан или недопустимый номер лицевого счета.'
		});
	}

	let opt = conf.db.gazolina;
	let pool = fb.pool(5, opt);

	// определяем текущкю дату запроса
	const date = new Date();
	const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	let content = {
		date_state: dateStr
	};

	try {
		// создаем пул из 5 подключений к база данных Газолины
		pool.get((err, db) => {
			if (err) {
				throw err;
			}

			// паралельно получаем всю информацию о лицевом счете
			Promise.all([
				gz.getCommonDataAcount(db, ls),
				gz.getEquipmentsAccount(db, ls),
				gz.getBenefitsAccount(db, ls),
				gz.getLastReading(db, ls, dateStr),
				gz.getPayments(db, ls, 30)
			])
			.then(results => {
					console.dir(results);
					// объединяем полученные объекты в один
					results.map(item => {
						Object.assign(content, item);
					});

					// возвращаем ответ
					res.json(content);
			})
			.catch(err => {
				// или возвращаем ошибочный результат
				res.json(err);
			});
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
