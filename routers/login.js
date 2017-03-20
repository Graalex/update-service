/**
 * login.js -- определение существования абонента
 */

const exp = require('express');
const util = require('util');
const conf = require('../config');
const cp1251 = require('windows-1251');
const fb = require('node-firebird');

let router = exp.Router();

router.get('/abonent/:ls/:family', (req, res) => {
	let ls = req.params['ls'];
	let fam = req.params['family'];

	// проверка параметров запроса
	if(util.isNullOrUndefined(ls) && ls <= 0) {
		res.json({
			status: 400,
			message: 'Не задан или недопустимый номер лицевого счета.'
		});
	}
	if(util.isNullOrUndefined(fam) && fam == '') {
		res.json({
			status: 400,
			message: 'Не задана фамилия абонента.'
		});
	}

	// Ищем в базе данных Газолины абонента по лицевому счету
	let query = `
		select first 1 peracc, name
		from abon
		where peracc = ${fb.escape(ls)}
	`;
	let opt = conf.db.gazolina;

	try {
		fb.attach(opt, (err, db) => {
			if (err) {
				throw err;
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					throw err;
				}

				// если получили пустой результат, то нет такого лицевого счета
				if (result.length == 0) {
					res.json({
						status: 404,
						message: 'Не найден лицевой счет.'
					});
					return;
				}

				// сравниваем фамилию в верхнем регистре в базе и переданным параметром
				let f = cp1251.decode(result[0].NAME.toString('binary')).trim();
				if (f.toUpperCase() !== fam.toUpperCase()) {
					res.json({
						status: 404,
						message: 'Не найдена фамилия абонента.'
					});
					return;
				}

				// проверку прошли, есть результат отправляем его
				let data = {
					ls: parseInt((result[0].PERACC).toString().trim()),
					family: f
				}
				res.json(data);
				db.detach();
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
});

module.exports = router;
