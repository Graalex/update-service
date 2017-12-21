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

	// создаем пул из 3 подключений к база данных Газолины
	let pool = fb.pool(3, opt);
	
	try {
		Promise.all([
			gz.getCommonDataAcount(pool, ls),
			gz.getEquipmentsAccount(pool, ls),
			gz.getBenefitsAccount(pool, ls),
		])
		.then(results => {
			let content = {
				date_state: new Date(),
			};
			// объединяем полученные объекты в один
			results.map(item => Object.assign(content, item));

			// возвращаем ответ
			return res.json({
				status: 200,
				message: 'Успешное выполнение запроса.',
				data: content
			});
		})
		// или возвращаем ошибочный результат
		.catch(err => res.json(err));
	}

	catch (err) {
		// возникла какая-то внутренняя ошибка
		res.json(err);
	}

	finally {
		// очищаем пул подключений
		pool.destroy();
	}
});

module.exports = router;
