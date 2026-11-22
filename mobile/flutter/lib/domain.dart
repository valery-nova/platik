import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

typedef RowData = Map<String, dynamic>;
List<RowData> rows(dynamic value) => value is List ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : [];
double number(dynamic value) => value is num && value.isFinite ? value.toDouble() : 0;
String today([int days = 0]) => DateFormat('yyyy-MM-dd').format(DateTime.now().subtract(Duration(days: days)));
String newId() => '${DateTime.now().microsecondsSinceEpoch}-${math.Random.secure().nextInt(1 << 32)}';
dynamic clone(dynamic value) => jsonDecode(jsonEncode(value));

class Catalog {
  static String lang='es';
  static late RowData source;
  static List<RowData> get currencies => rows(source['currencies']);
  static List<RowData> get countries => rows(source['countries']);
  static List<RowData> get distribution => rows(source['distributionCatalog']);
  static Future<void> load() async { source = jsonDecode(await rootBundle.loadString('assets/web_reference.json')) as RowData; }
  static int digits(String currency) => currencies.where((c) => c['code'] == currency).firstOrNull?['digits'] as int? ?? 2;
  static String currencyName(String code) => currencies.where((c) => c['code'] == code).firstOrNull?[lang=='en'?'nameEn':'name'] as String? ?? code;
  static String countryName(String code) => countries.where((c) => c['code'] == code).firstOrNull?[lang=='en'?'nameEn':'name'] as String? ?? code;
  static List<String> categories(String type) => List<String>.from(source['categories'][type] as List? ?? []);
  static List<RowData> defaults([String? type]) => rows(clone(source['defaults'][type ?? '']));
  static RowData fresh(bool demo) {
    final data = Map<String,dynamic>.from(clone(source[demo ? 'demo' : 'empty']));
    if (demo) {
      final delta = DateTime.parse(today()).difference(DateTime.parse(source['generatedOn'] as String)).inDays;
      for (final key in ['transactions', 'goals']) {
        for (final row in data[key] as List) {
          for (final field in ['fecha', 'fechaObjetivo']) {
            if (row[field] is String) row[field] = DateFormat('yyyy-MM-dd').format(DateTime.parse(row[field] as String).add(Duration(days: delta)));
          }
        }
      }
    }
    return data;
  }
}

double rounded(num value, String currency) {
  final factor = math.pow(10, Catalog.digits(currency)).toDouble();
  return (value * factor + (value >= 0 ? 1e-9 : -1e-9)).round() / factor;
}
String money(num value, String currency) => NumberFormat.currency(locale: Catalog.lang, name: currency, symbol: currency == 'BOB' ? 'Bs' : currency, decimalDigits: Catalog.digits(currency)).format(value);
String pct(num value, [int decimals = 1]) => '${NumberFormat.decimalPatternDigits(locale: Catalog.lang, decimalDigits: decimals).format(value)} %';
bool validConversion(RowData row, String base) => row['baseCurrency'] == base && row['baseAmount'] is num && number(row['exchangeRate']) > 0 && (row['baseAmount'] as num).isFinite;
double? inBase(RowData row, String base) => (row['moneda'] ?? 'BOB') == base ? number(row['monto']) : validConversion(row, base) ? number(row['baseAmount']) : null;
bool hasSnapshot(RowData row) => row['baseAmount'] != null || row['exchangeRate'] != null || row['exchangeRateSource'] != null;

class PeriodSummary {
  PeriodSummary(List<RowData> txs, this.currency, this.from, this.to) {
    for (final row in txs) {
      final date = row['fecha'] as String? ?? '';
      if (date.compareTo(from) < 0 || date.compareTo(to) > 0) continue;
      final amount = inBase(row, currency);
      final incoming = row['tipo'] == 'ingreso';
      if (amount == null) { incoming ? pendingIncome++ : pendingExpenses++; continue; }
      if (incoming) { income += amount; incomeCount++; }
      else { if (row['tipo'] == 'costo') { costs += amount; } else { expenses += amount; } expenseCount++; }
    }
    income = rounded(income, currency); costs = rounded(costs, currency); expenses = rounded(expenses, currency);
  }
  final String currency, from, to;
  double income = 0, costs = 0, expenses = 0;
  int incomeCount = 0, expenseCount = 0, pendingIncome = 0, pendingExpenses = 0;
  double get out => rounded(costs + expenses, currency);
  double get profit => rounded(income - out, currency);
  double? get margin => income > 0 ? profit / income * 100 : null;
  int get pending => pendingIncome + pendingExpenses;
  bool get sufficient => incomeCount > 0 && incomeCount + expenseCount >= 3;
  RowData toJson() => {'ingresos': income, 'costos': costs, 'gastos': expenses, 'egresos': out, 'ganancia': profit, 'margen': margin, 'nIngresos': incomeCount, 'nEgresos': expenseCount, 'pendientesIngresos': pendingIncome, 'pendientesEgresos': pendingExpenses};
}

class AvailableBalance {
  AvailableBalance(RowData data, this.currency) {
    final opening = data['openingBalance'];
    final adjustments = rows(data['balanceAdjustments']);
    final transactions = rows(data['transactions']);
    final hasData = opening != null || adjustments.isNotEmpty || transactions.isNotEmpty;
    if (opening is Map) {
      final v = inBase(Map<String,dynamic>.from(opening), currency);
      if (v == null) { pendingAdjustments++; } else { initial = rounded(v, currency); hasOpening = true; }
    }
    for (final row in adjustments) {
      final v = inBase(row, currency);
      if (v == null) { pendingAdjustments++; } else { adjusted = rounded(adjusted + v, currency); hasOpening = true; }
    }
    for (final row in transactions) {
      final v = inBase(row, currency);
      if (v == null) { row['tipo'] == 'ingreso' ? pendingIncome++ : pendingExpenses++; }
      else { net = rounded(net + (row['tipo'] == 'ingreso' ? v : -v), currency); }
    }
    if (pendingExpenses + pendingAdjustments > 0) {
      status = 'incompleto'; reason = '${pendingExpenses + pendingAdjustments} importe(s) en otra moneda no tienen cotización válida. El saldo no se puede determinar.';
    } else if (!hasData) {
      status = 'sin_datos'; reason = 'Aún no registras saldo inicial, ajustes ni movimientos.';
    } else {
      amount = rounded(initial + adjusted + net, currency);
      status = pendingIncome > 0 ? 'parcial' : 'determinado';
      reason = pendingIncome > 0 ? 'Estimación conservadora: $pendingIncome ingreso(s) sin cotización válida no se cuentan.' : amount! > 0 ? 'Saldo de apertura + ajustes + movimientos registrados. No es tu saldo bancario.' : 'No hay excedente para distribuir.';
    }
  }
  final String currency;
  double initial = 0, adjusted = 0, net = 0;
  double? amount;
  bool hasOpening = false;
  int pendingIncome = 0, pendingExpenses = 0, pendingAdjustments = 0;
  late String status, reason;
  RowData toJson() => {'estado': status, 'monto': amount, 'saldoInicial': hasOpening ? initial : null, 'ajustes': adjusted, 'netoMovimientos': net, 'pendientesIngresos': pendingIncome, 'pendientesEgresos': pendingExpenses, 'pendientesAjustes': pendingAdjustments};
}

List<RowData> categoryTotals(List<RowData> txs, String currency, [List<String> types = const ['gasto','costo']]) {
  final acc = <String,double>{};
  for (final row in txs) { final v = inBase(row,currency); if (v != null && types.contains(row['tipo'])) { final key = row['categoria'] as String? ?? ''; acc[key] = (acc[key] ?? 0) + v; } }
  final values = acc.entries.map((e) => <String,dynamic>{'categoria':e.key,'total':rounded(e.value,currency)}).toList();
  final total = values.fold<double>(0,(sum,row)=>sum+number(row['total']));
  for (final row in values) { row['porcentaje'] = total > 0 ? number(row['total']) / total * 100 : 0.0; }
  values.sort((a,b)=>number(b['total']).compareTo(number(a['total'])));
  return values;
}

List<RowData> monthlySeries(List<RowData> txs, String currency) {
  final now = DateTime.now();
  return List.generate(6,(index) {
    final start = DateTime(now.year,now.month - 5 + index);
    final end = DateTime(start.year,start.month + 1,0);
    final summary = PeriodSummary(txs,currency,DateFormat('yyyy-MM-dd').format(start),DateFormat('yyyy-MM-dd').format(end));
    return {'mes':DateFormat('MMM',Catalog.lang).format(start),'ingresos':summary.income,'egresos':summary.out,'ganancia':summary.profit};
  });
}

RowData distributionAmounts(List<RowData> items, double available, String currency) {
  final base = rounded(math.max(available,0),currency);
  final step = 1 / math.pow(10,Catalog.digits(currency));
  final amounts = <String,double>{for(final item in items) item['key'] as String:rounded(base * math.max(number(item['porcentaje']),0) / 100,currency)};
  double assigned() => rounded(amounts.values.fold<double>(0,(a,b)=>a+b),currency);
  final total = items.fold<double>(0,(a,b)=>a+number(b['porcentaje']));
  if (assigned() > base && assigned() > 0) {
    final scale = base / assigned();
    for (final key in amounts.keys.toList()) { amounts[key] = rounded(((amounts[key]! * scale / step + 1e-6).floor()) * step,currency); }
  }
  if (amounts.isNotEmpty && (total - 100).abs() < 1e-6 && base > assigned() || amounts.isNotEmpty && total > 100 && base > assigned()) {
    final key = amounts.keys.reduce((a,b)=>amounts[b]! > amounts[a]! ? b:a);
    amounts[key] = rounded(amounts[key]! + base - assigned(),currency);
  }
  return {'porCategoria':amounts,'sinAsignar':rounded(math.max(0,base-assigned()),currency)};
}

List<RowData> findings(List<RowData> txs, String currency) {
  final a = PeriodSummary(txs,currency,today(29),today());
  final p = PeriodSummary(txs,currency,today(59),today(30));
  final out = <RowData>[];
  void add(String id,String tone,String text,String calculation) => out.add({'id':id,'tono':tone,'texto':text,'calculo':calculation});
  String m(num n) => money(n,currency);
  if (a.incomeCount + a.expenseCount == 0) {
    add('sin_datos','info','No hay movimientos con importe en tu moneda principal en este período. Registra transacciones para ver qué pasa con tu dinero.','0 movimientos usables');
  } else {
    if (a.incomeCount > 0) {
      if (a.profit > 0) { add('resultado_positivo','positivo','El período deja una ganancia estimada de ${m(a.profit)}: de cada $currency 100 que entraron quedaron aproximadamente $currency ${a.margin!.round()}.','${m(a.income)} − ${m(a.out)} = ${m(a.profit)}; margen ${pct(a.margin!)}'); }
      else if (a.profit < 0) { add('resultado_negativo','alerta','Los egresos superaron a los ingresos por ${m(a.profit.abs())}. Revisa las categorías de mayor gasto.','${m(a.income)} − ${m(a.out)} = ${m(a.profit)}'); }
      else { add('resultado_cero','neutral','Los ingresos cubrieron exactamente los egresos: el período no deja excedente.','${m(a.income)} − ${m(a.out)} = ${m(0)}'); }
    } else { add('sin_ingresos','alerta','El período solo registra egresos (${m(a.out)}) y ningún ingreso usable.','${a.expenseCount} egreso(s), 0 ingresos'); }
    if (!a.sufficient) { add('datos_insuficientes','info','Hay pocos movimientos para establecer una tendencia confiable. Se necesitan al menos 3, incluido un ingreso.','${a.incomeCount} ingreso(s), ${a.expenseCount} egreso(s)'); }
    else if (!p.sufficient) { add('sin_comparacion','info','El período anterior no tiene datos suficientes para comparar.','${p.incomeCount} ingreso(s), ${p.expenseCount} egreso(s)'); }
    else {
      for (final pair in [(a.income,p.income,'ingresos',true),(a.out,p.out,'egresos',false),(a.profit,p.profit,'ganancia',true)]) {
        if (pair.$2 <= 0) continue;
        final change = (pair.$1-pair.$2)/pair.$2*100;
        if (change.abs() >= 5) { add('${pair.$3}_${change>0?'suben':'bajan'}',((change>0)==pair.$4)?'positivo':'alerta','Tus ${pair.$3} ${change>0?'aumentaron':'disminuyeron'} ${pct(change.abs())} respecto al período anterior.','${m(pair.$2)} → ${m(pair.$1)}'); }
        else if(pair.$3=='ingresos') { add('ingresos_estables','neutral','Tus ingresos se mantuvieron estables respecto al período anterior.','${m(pair.$2)} → ${m(pair.$1)} (${pct(change)})'); }
      }
      if (a.pending+p.pending>0) { add('tendencias_parciales','info','Hay importes sin cotización excluidos. Las tendencias pueden no reflejar el negocio completo. Actualiza las cotizaciones.','Totales parciales'); }
      if (a.margin!=null&&p.margin!=null&&(a.margin!-p.margin!).abs()>=2) { final diff=a.margin!-p.margin!;add('margen','${diff>0?'positivo':'alerta'}','Tu margen de ganancia ${diff>0?'mejoró':'disminuyó'} ${diff.abs().toStringAsFixed(1)} puntos.','${pct(p.margin!)} → ${pct(a.margin!)}'); }
    }
    final range=txs.where((r)=>(r['fecha'] as String).compareTo(today(29))>=0&&(r['fecha'] as String).compareTo(today())<=0).toList();
    final expenses=categoryTotals(range,currency), income=categoryTotals(range,currency,['ingreso']);
    if(expenses.length>=2&&number(expenses.first['porcentaje'])>=40) {final top=expenses.first;add('concentracion_egresos','alerta','“${top['categoria']}” concentra ${pct(number(top['porcentaje']),0)} de tus egresos. Revisarla tiene el mayor impacto.','${m(number(top['total']))} de ${m(a.out)}');}
    if(income.length>=2) {final top=income.first;add('fuente_principal','neutral','Tu principal fuente de ingreso fue “${top['categoria']}” (${pct(number(top['porcentaje']),0)}).','${m(number(top['total']))} de ${m(a.income)}');}
  }
  if(a.pending>0) {add('pendientes_conversion','info','${a.pending} movimiento(s) en otra moneda no tienen cotización válida y no se incluyen en este análisis.','${a.pending} excluido(s) de los totales');}
  if(p.pending>0&&a.pending==0) {add('pendientes_previos','info','El período anterior tiene ${p.pending} movimiento(s) sin cotización válida: la comparación es parcial.','Período anterior parcial');}
  return out;
}
