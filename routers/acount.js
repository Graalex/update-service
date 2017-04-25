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

	// создаем пул из 7 подключений к база данных Газолины
	let pool = fb.pool(7, opt);

	// определяем текущкю дату запроса
	const date = new Date();
	let content = {
		date_state: date
	};

	try {

		Promise.all([
			gz.getCommonDataAcount(pool, ls),
			gz.getEquipmentsAccount(pool, ls),
			gz.getBenefitsAccount(pool, ls),
			// gz.getLastReading(pool, ls, dateStr),
			gz.getPayments(pool, ls, 12),
			// gz.getReadings(pool, ls, 12),
			gz.getAllocations(pool, ls, 12)
		])
		.then(results => {
				// объединяем полученные объекты в один
				results.map(item => {
					switch (item.kind) {
						case 'payments':
							content.payments = item.data;
							content.last_payment_date = content.payments[0].date;
							content.last_payment = content.payments[0].amount;
							break;

						case 'readings':
							content.reaings = item.data;
							break;

						case 'allocations':
							content.allocations = item.data;
							break;

						default:
							Object.assign(content, item.data);
							break;
					}
				});

			// возвращаем ответ
			let data = {
				status: 200,
				message: 'Успешное выполнение запроса.',
				content: content
			};
			res.json(data);
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
