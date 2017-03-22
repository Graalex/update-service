/**
 * acount.js -- получить общую информацию о лицевом счете абонента.
 */

const exp = require('express');
const util = require('util');
const conf = require('../config');
const cp1251 = require('windows-1251');
const fb = require('node-firebird');

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

	// Ищем в базе данных Газолины информацию об лицевом счету
	let query = `
		select first 1
			a.peracc, a.eic, a.name, a.firstname, a.patronymic, i.name as "CITY_TYPE",
			c.name as "CITY", st.name as "STR_TYPE", s.name as "STREET", a.buildnum, a.buildlitter,
			a.apartmentnum, a.apartmentlitter, m.name as "RAYON", ct.name as "COUNTER", cnt.serial,
			ch.square, ch.peoplecnt,
			ad.profilenum as "GROUP", ad.comment as "GROUP_NAME", am.monthcoef1, am.monthcoef2,
			am.monthcoef3, am.monthcoef4, am.monthcoef5, am.monthcoef6, am.monthcoef7, am.monthcoef8,
			am.monthcoef9, am.monthcoef10, am.monthcoef11, am.monthcoef12
		from abon a
		left join street s on s.streetkey = a.streetr
		left join microrajon m on m.microrajonkey = a.microrajonsr
		left join counter cnt on cnt.ownerkodr = a.kod
		left join (
    	select ap.datic, ap.kodr, ap.abonprofiledirr
    	from abonprofiles ap
    	where ap.datic = (select first 1 max(datic) from abonprofiles where kodr=ap.kodr and isbadv = 0)
		) ap on a.kod = ap.kodr
		join (
    	select ch.kodr, ch.square, ch.peoplecnt
    	from change ch
    	where ch.datic = (select first 1 max(datic) from change where kodr = ch.kodr)
		) ch on ch.kodr = a.kod
		left join abonprofiledir ad on ad.abonprofiledirkey = ap.abonprofiledirr
		left join abonprofilemonthcoef am on am.abonprofiledirr = ad.abonprofiledirkey
		left join countertype ct on ct.countertypekey = cnt.countertyper
		left join streettype st on st.streettypekey = s.streettyper
		left join city c on c.citykey = s.cityr
		left join inhabitedlocalitytype i on i.inhabitedlocalitytypekey = c.inhabitedlocalitytyper
		where a.peracc = ${fb.escape(ls)}
	`;

	let eq = `
		select a.peracc, et.name as "EQ_TYPE", ek.name as "EQ_NAME"
    from change c
    join equipment e on c.changekey = e.changer
    join eqtype et on e.eqtyper = et.eqtypekey
    join eqkind ek on e.eqkindr = ek.eqkindkey
    join abon a on a.kod = c.kodr
    where c.datic = (select first 1 max(datic) from change where kodr = c.kodr) and a.peracc = ${fb.escape(ls)}
	`;

	let opt = conf.db.gazolina;
	let content = {};

	let pool = fb.pool(5, opt);

	try {
		pool.get((err, db) => {
			if (err) {
				throw err;
			}

			// основная информация о счете
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					throw err;
				}

				// если получили пустой результат, то нет такого лицевого счета
				if (result.length == 0) {
					res.json({
						status: 404,
						message: 'Неверный лицевой счет.'
					});
					return;
				}

				let val = result[0];

				// начинаем строить ответ
				// адресная строка
				let adr = [
					cp1251.decode(val.CITY_TYPE.toString('binary')).trim(),
					cp1251.decode(val.CITY.toString('binary')).trim() + ',',
					cp1251.decode(val.RAYON.toString('binary')).trim(),
					'р-н,',
					cp1251.decode(val.STR_TYPE.toString('binary')).trim(),
					cp1251.decode(val.STREET.toString('binary')).trim() + ',',
					'д.',
					val.BUILDNUM
				]
				.join(' ');

				if (val.BUILDLITTER) {
					adr += cp1251.decode(val.BUILDLITTER.toString('binary')).trim();
				}
				if (val.APARTMENTNUM) {
					adr += `кв. ${val.APARTMENTNUM}`;
				}

				// общая информация о счете
				content.ls = parseInt(val.PERACC.toString().trim());
				content.eic = val.EIC.toString().trim();
				content.family = cp1251.decode(val.NAME.toString('binary')).trim();
				content.name = val.FIRSTNAME !== null ? cp1251.decode(val.FIRSTNAME.toString('binary')).trim() : '';
				content.patronymic = val.PATRONYMIC !== null ? cp1251.decode(val.PATRONYMIC.toString('binary')).trim() : '';
				content.address = adr;
				content.meter = val.COUNTER !== null ? cp1251.decode(val.COUNTER.toString('binary')).trim() : null;
				content.meter_numb = val.SERIAL !== null ? cp1251.decode(val.SERIAL.toString('binary')).trim() : null;
				content.group = val.GROUP;
				content.group_name = val.GROUP_NAME !== null ? cp1251.decode(val.GROUP_NAME.toString('binary')).trim() : null;
				content.heated_area = val.SQUARE;
				content.registered_persons = val.PEOPLECNT;
				content.pw_1 = val.MONTHCOEF1;
				content.pw_2 = val.MONTHCOEF2;
				content.pw_3 = val.MONTHCOEF3;
				content.pw_4 = val.MONTHCOEF4;
				content.pw_5  = val.MONTHCOEF5;
				content.pw_6 = val.MONTHCOEF6;
				content.pw_7 = val.MONTHCOEF7;
				content.pw_8 = val.MONTHCOEF8;
				content.pw_9 = val.MONTHCOEF9;
				content.pw_10 = val.MONTHCOEF10;
				content.pw_11 = val.MONTHCOEF11;
				content.pw_12 = val.MONTHCOEF12;

				db.detach();

				// отправляем результат
				res.json({
					status: 200,
					message: 'Успешное выполнение запроса.',
					content: content
				});
			});
		});

		// получаем газопотребляющее оборудование
		pool.get((err, db) => {
			if (err) {
				throw err;
			}

			db.query(eq,(err, result) => {
				if (err) {
					db.detach();
					throw err;
				}

				let equipments = [];
				result.map(item => {
					equipments.push(`${cp1251.decode(item.EQ_TYPE.toString('binary')).trim()} (${cp1251.decode(item.EQ_NAME.toString('binary')).trim()})`);
				});
				content.equipments = equipments.join('; ');

				db.detach();
				console.log('Two content');
				console.dir(content);
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
		pool.destroy();
	}
});

module.exports = router;
