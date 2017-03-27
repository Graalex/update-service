/**
 * gazolina.js -- модулб для извлечения данных с таблиц Газодины.
 */

const cp1251 = require('windows-1251');
const fb = require('node-firebird');

/**
 * Получить основную информацию о лицевом счете
 * @param pool {Object} пул подключений к базе данных газолина
 * @param ls {number} номер лицевого счета абонента
 * @returns {Promise}
 */
module.exports.getCommonDataAcount = (pool, ls) => {
	return new Promise((resolve, reject) => {
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
		let content = {};

		pool.get((err, db) => {
			if (err) {
				db.detach();
				reject({
					status: 500,
					message: err.message
				});
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					reject({
						status: 500,
						message: err.message
					});
				}

				// если получили пустой результат, то нет такого лицевого счета
				if (result.length == 0) {
					db.detach();
					reject({
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
					cp1251.decode(val.STR_TYPE.toString('binary')).trim().toLowerCase(),
					cp1251.decode(val.STREET.toString('binary')).trim() + ',',
					'д.',
					val.BUILDNUM
				]
					.join(' ');

				if (val.BUILDLITTER) {
					adr += cp1251.decode(val.BUILDLITTER.toString('binary')).trim();
				}
				if (val.APARTMENTNUM) {
					adr += ` кв. ${val.APARTMENTNUM}`;
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
			});
			db.detach();

			resolve({
				kind: 'common',
				data: content
			});
		});
	});
}

/**
 * Получить информацию об газопотребляющем оборудовании по лицевому счету
 * @param pool {Object} пул подключений к базе данных газолина
 * @param ls {number} номер лицевого счета абонента
 * @returns {Promise}
 */
module.exports.getEquipmentsAccount = (pool, ls) => {
	return new Promise((resolve, reject) => {
		let query = `
			select a.peracc, et.name as "EQ_TYPE", ek.name as "EQ_NAME"
    	from change c
    	join equipment e on c.changekey = e.changer
			join eqtype et on e.eqtyper = et.eqtypekey
			join eqkind ek on e.eqkindr = ek.eqkindkey
			join abon a on a.kod = c.kodr
			where c.datic = (select first 1 max(datic) from change where kodr = c.kodr) and a.peracc = ${fb.escape(ls)}
		`;
		let equipments = [];

		pool.get((err, db) =>{
			if (err) {
				db.detach();
				reject({
					status: 500,
					message: err.message
				});
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					reject({
						status: 500,
						message: err.message
					});
				}

				result.map(item => {
					equipments.push(`${cp1251.decode(item.EQ_TYPE.toString('binary')).trim()} (${cp1251.decode(item.EQ_NAME.toString('binary')).trim()})`);
				});
				db.detach();

				resolve({
					kind: "equipment",
					data: {
						equipments: equipments.join('; ')
					}
				});
			});
		});
	});
}

/**
 * Получить информацию о льготе для лицевого счетеа
 * @param pool {Object} пул подключений к базе данных газолина
 * @param ls {number} номер лицевого счета абонента
 * @returns {Promise}
 */
module.exports.getBenefitsAccount = (pool, ls) => {
	return new Promise((resolve, reject) => {
		let query = `
		select first 1 pt.percentage as "KIND", pp.privpeopcnt as "COUNT"
		from privnormainfo pn
		left join privtype pt on pt.privtypekey = pn.privtyper
		left join privpart pp on pp.privpartkey = pn.privpartr
		left join abon a on a.kod = pn.kodr
		where a.peracc = ${fb.escape(ls)}
	`;
		let benefits = {};

		pool.get((err, db) => {
			if (err) {
				db.detach();
				reject({
					status: 500,
					message: err.message
				});
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					reject({
						status: 500,
						message: err.message
					});
				}

				if (result.length > 0) {
					let val = result[0];
					benefits.kind_benefits = val.KIND == 0 ? null : val.KIND;
					benefits.benefits_persons = val.COUNT;
				}
				db.detach();

				resolve({
					kind: 'benefits',
					data: benefits
				});
			});
		});
	});
}

/**
 * Получить информацию о последних показаниях газового счетчика
 * @param pool {Object} пул подключений к базе данных газолина
 * @param ls {number} номер лицевого счета абонента
 * @param date {String} строка даты в форматк YYYY-MM-DD
 * @returns {Promise}
 */
module.exports.getLastReading = (pool, ls, date) => {
	return new Promise((resolve, reject) => {
		let query = `
			select c.initvalue + sum(v.vdiffer) as "LAST_TAPE", max(v.checkdate) as "LAST_DATE"
			from valuic v
			join abon a on a.kod = v.kodr
			join counter c on c.counterkey = v.counterr
			where  a.peracc=${fb.escape(ls)} and v.ischecked <> 0 and v.checkdate <= ${fb.escape(date)}
			group by c.initvalue
		`;
		let lastReading = {};

		pool.get((err, db) => {
			if (err) {
				db.detach();
				reject({
					status: 500,
					message: err.message
				});
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					reject({
						status: 500,
						message: err.message
					});
				}

				lastReading.last_reading_meter = result[0].LAST_TAPE;
				lastReading.last_reading_date = result[0].LAST_DATE;
				db.detach();

				resolve({
					kind: 'last-reading',
					data: lastReading
				});
			});
		});
	});
}

/**
 * Получить платежи по лицевому счету в порядке убывания
 * @param pool {Object} пул подключений к базе данных газолина
 * @param ls {number} номер лицевого счета абонента
 * @param numb {number} количество платежей
 * @returns {Promise}
 */
module.exports.getPayments = (pool, ls, numb) => {
	return new Promise((resolve, reject) => {
		let query = `
			select first ${numb} p.datic as PAY_DATE, p.sumic as AMOUNT
			from payment p
			join abon a on a.kod = p.kodr
			where a.peracc = ${fb.escape(ls)} and p.ischecked <> 0
			order by p.datic DESC
		`;
		let payments = [];

		pool.get((err, db) => {
			if (err) {
				db.detach();
				reject({
					status: 500,
					message: err.message
				});
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					reject({
						status: 500,
						message: err.message
					});
				}

				result.map(item => {
					payments.push({
						date: item.PAY_DATE,
						amount: item.AMOUNT
					});
				});
				db.detach();

				resolve({
					kind: 'payments',
					data: payments
				});
			});
		});
	});
}

/**
 * Получить показания сяетчика по лицевому счету в порядке убывания
 * @param pool {Object} пул подключений к базе данных газолина
 * @param ls {number} номер лицевого счета абонента
 * @param numb {number} количество платежей
 * @returns {Promise}
 */
module.exports.getReadings = (pool, ls, numb) => {
	return new Promise((resolve, reject) => {
		let query = `
			select first ${numb} 
				v.checkdate as "DATE", c.initvalue + sum(v.vdiffer) as "TAPE"
			from valuic v
			join abon a on a.kod = v.kodr
			join counter c on c.counterkey = v.counterr
			where  a.peracc=${fb.escape(ls)} and v.ischecked <> 0
			group by v.checkdate, c.initvalue
			order by v.checkdate desc
		`;
		let readings = [];

		pool.get((err, db) => {
			if (err) {
				reject({
					status: 500,
					message: err.message
				});
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					reject({
						status: 500,
						message: err.message
					});
				}

				result.map(item => {
					readings.push({
						date: item.DATE,
						tape: item.TAPE
					});
					db.detach();

					resolve({
						kind: 'readings',
						data: readings
					});
				});
			});
		});
	});
}

/**
 * Получить показания сяетчика по лицевому счету в порядке убывания
 * @param pool {Object} пул подключений к базе данных газолина
 * @param ls {number} номер лицевого счета абонента
 * @param numb {number} количество платежей
 * @returns {Promise}
 */
module.exports.getAllocations = (pool, ls, numb) => {
	return new Promise((resolve, reject) => {
		// вычисляем интервалы
		let curDate = new Date();
		let endDate = new Date(curDate.getFullYear(), curDate.getMonth(), 0);
		let beginDate = new Date(curDate.getFullYear(), curDate.getMonth() - numb - 1, 1);
		// console.log(curDate.getMonth());
		// console.log(endDate);

		let query = `
			select c.begindate as BEGIN_DATE, c.enddate as END_DATE, c.calcdate as "DATE", c.v as "VOLUME"
			from calc c
			join abon a on a.kod = c.kodr
			where c.begindate >= ${fb.escape(beginDate)} and c.enddate <= ${fb.escape(endDate)} and a.peracc = ${fb.escape(ls)}
			order by c.calcdate desc
		`;
		let allocations = [];

		pool.get((err, db) => {
			if (err) {
				reject({
					status: 500,
					message: err.message
				});
			}

			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					reject({
						status: 500,
						message: err.message
					});
				}

				result.map(item => {
					allocations.push({
						beginDate: item.BEGIN_DATE,
						endDate: item.END_DATE,
						date: item.DATE,
						volume: item.VOLUME
					});
				});
				db.detach();

				resolve({
					kind: 'allocations',
					data: allocations
				});
			});
		});
	});
}