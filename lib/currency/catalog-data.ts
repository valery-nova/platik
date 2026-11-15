/**
 * DATOS GENERADOS — no editar a mano.
 * Monedas: ISO 4217 (currency-codes 2.2.0, datos oficiales ISO del 2024-06-25).
 * Países: ISO 3166-1 alpha-2 (dataset world-countries / mledoze, 250 países).
 * Los nombres se localizan en runtime con Intl.DisplayNames; aquí solo van
 * códigos, dígitos decimales y el nombre en inglés como respaldo.
 */

export interface CurrencyInfo {
  /** Código ISO 4217 (ej. "BOB"). */
  code: string;
  /** Número ISO 4217 (ej. "068"). */
  number: string;
  /** Decimales de la moneda (0, 2 o 3 según ISO 4217). */
  digits: number;
  /** Nombre en inglés (respaldo si Intl.DisplayNames no está disponible). */
  name: string;
}

export interface CountryInfo {
  /** Código ISO 3166-1 alpha-2 (ej. "BO"). */
  code: string;
  /** Monedas ISO 4217 usadas en el país (la primera es la sugerida). */
  currencies: string[];
}

export const CURRENCY_CATALOG: CurrencyInfo[] = [
  {
    "code": "AED",
    "number": "784",
    "digits": 2,
    "name": "UAE Dirham"
  },
  {
    "code": "AFN",
    "number": "971",
    "digits": 2,
    "name": "Afghani"
  },
  {
    "code": "ALL",
    "number": "008",
    "digits": 2,
    "name": "Lek"
  },
  {
    "code": "AMD",
    "number": "051",
    "digits": 2,
    "name": "Armenian Dram"
  },
  {
    "code": "ANG",
    "number": "532",
    "digits": 2,
    "name": "Netherlands Antillean Guilder"
  },
  {
    "code": "AOA",
    "number": "973",
    "digits": 2,
    "name": "Kwanza"
  },
  {
    "code": "ARS",
    "number": "032",
    "digits": 2,
    "name": "Argentine Peso"
  },
  {
    "code": "AUD",
    "number": "036",
    "digits": 2,
    "name": "Australian Dollar"
  },
  {
    "code": "AWG",
    "number": "533",
    "digits": 2,
    "name": "Aruban Florin"
  },
  {
    "code": "AZN",
    "number": "944",
    "digits": 2,
    "name": "Azerbaijan Manat"
  },
  {
    "code": "BAM",
    "number": "977",
    "digits": 2,
    "name": "Convertible Mark"
  },
  {
    "code": "BBD",
    "number": "052",
    "digits": 2,
    "name": "Barbados Dollar"
  },
  {
    "code": "BDT",
    "number": "050",
    "digits": 2,
    "name": "Taka"
  },
  {
    "code": "BGN",
    "number": "975",
    "digits": 2,
    "name": "Bulgarian Lev"
  },
  {
    "code": "BHD",
    "number": "048",
    "digits": 3,
    "name": "Bahraini Dinar"
  },
  {
    "code": "BIF",
    "number": "108",
    "digits": 0,
    "name": "Burundi Franc"
  },
  {
    "code": "BMD",
    "number": "060",
    "digits": 2,
    "name": "Bermudian Dollar"
  },
  {
    "code": "BND",
    "number": "096",
    "digits": 2,
    "name": "Brunei Dollar"
  },
  {
    "code": "BOB",
    "number": "068",
    "digits": 2,
    "name": "Boliviano"
  },
  {
    "code": "BOV",
    "number": "984",
    "digits": 2,
    "name": "Mvdol"
  },
  {
    "code": "BRL",
    "number": "986",
    "digits": 2,
    "name": "Brazilian Real"
  },
  {
    "code": "BSD",
    "number": "044",
    "digits": 2,
    "name": "Bahamian Dollar"
  },
  {
    "code": "BTN",
    "number": "064",
    "digits": 2,
    "name": "Ngultrum"
  },
  {
    "code": "BWP",
    "number": "072",
    "digits": 2,
    "name": "Pula"
  },
  {
    "code": "BYN",
    "number": "933",
    "digits": 2,
    "name": "Belarusian Ruble"
  },
  {
    "code": "BZD",
    "number": "084",
    "digits": 2,
    "name": "Belize Dollar"
  },
  {
    "code": "CAD",
    "number": "124",
    "digits": 2,
    "name": "Canadian Dollar"
  },
  {
    "code": "CDF",
    "number": "976",
    "digits": 2,
    "name": "Congolese Franc"
  },
  {
    "code": "CHE",
    "number": "947",
    "digits": 2,
    "name": "WIR Euro"
  },
  {
    "code": "CHF",
    "number": "756",
    "digits": 2,
    "name": "Swiss Franc"
  },
  {
    "code": "CHW",
    "number": "948",
    "digits": 2,
    "name": "WIR Franc"
  },
  {
    "code": "CLF",
    "number": "990",
    "digits": 4,
    "name": "Unidad de Fomento"
  },
  {
    "code": "CLP",
    "number": "152",
    "digits": 0,
    "name": "Chilean Peso"
  },
  {
    "code": "CNY",
    "number": "156",
    "digits": 2,
    "name": "Yuan Renminbi"
  },
  {
    "code": "COP",
    "number": "170",
    "digits": 2,
    "name": "Colombian Peso"
  },
  {
    "code": "COU",
    "number": "970",
    "digits": 2,
    "name": "Unidad de Valor Real"
  },
  {
    "code": "CRC",
    "number": "188",
    "digits": 2,
    "name": "Costa Rican Colon"
  },
  {
    "code": "CUC",
    "number": "931",
    "digits": 2,
    "name": "Peso Convertible"
  },
  {
    "code": "CUP",
    "number": "192",
    "digits": 2,
    "name": "Cuban Peso"
  },
  {
    "code": "CVE",
    "number": "132",
    "digits": 2,
    "name": "Cabo Verde Escudo"
  },
  {
    "code": "CZK",
    "number": "203",
    "digits": 2,
    "name": "Czech Koruna"
  },
  {
    "code": "DJF",
    "number": "262",
    "digits": 0,
    "name": "Djibouti Franc"
  },
  {
    "code": "DKK",
    "number": "208",
    "digits": 2,
    "name": "Danish Krone"
  },
  {
    "code": "DOP",
    "number": "214",
    "digits": 2,
    "name": "Dominican Peso"
  },
  {
    "code": "DZD",
    "number": "012",
    "digits": 2,
    "name": "Algerian Dinar"
  },
  {
    "code": "EGP",
    "number": "818",
    "digits": 2,
    "name": "Egyptian Pound"
  },
  {
    "code": "ERN",
    "number": "232",
    "digits": 2,
    "name": "Nakfa"
  },
  {
    "code": "ETB",
    "number": "230",
    "digits": 2,
    "name": "Ethiopian Birr"
  },
  {
    "code": "EUR",
    "number": "978",
    "digits": 2,
    "name": "Euro"
  },
  {
    "code": "FJD",
    "number": "242",
    "digits": 2,
    "name": "Fiji Dollar"
  },
  {
    "code": "FKP",
    "number": "238",
    "digits": 2,
    "name": "Falkland Islands Pound"
  },
  {
    "code": "GBP",
    "number": "826",
    "digits": 2,
    "name": "Pound Sterling"
  },
  {
    "code": "GEL",
    "number": "981",
    "digits": 2,
    "name": "Lari"
  },
  {
    "code": "GHS",
    "number": "936",
    "digits": 2,
    "name": "Ghana Cedi"
  },
  {
    "code": "GIP",
    "number": "292",
    "digits": 2,
    "name": "Gibraltar Pound"
  },
  {
    "code": "GMD",
    "number": "270",
    "digits": 2,
    "name": "Dalasi"
  },
  {
    "code": "GNF",
    "number": "324",
    "digits": 0,
    "name": "Guinean Franc"
  },
  {
    "code": "GTQ",
    "number": "320",
    "digits": 2,
    "name": "Quetzal"
  },
  {
    "code": "GYD",
    "number": "328",
    "digits": 2,
    "name": "Guyana Dollar"
  },
  {
    "code": "HKD",
    "number": "344",
    "digits": 2,
    "name": "Hong Kong Dollar"
  },
  {
    "code": "HNL",
    "number": "340",
    "digits": 2,
    "name": "Lempira"
  },
  {
    "code": "HTG",
    "number": "332",
    "digits": 2,
    "name": "Gourde"
  },
  {
    "code": "HUF",
    "number": "348",
    "digits": 2,
    "name": "Forint"
  },
  {
    "code": "IDR",
    "number": "360",
    "digits": 2,
    "name": "Rupiah"
  },
  {
    "code": "ILS",
    "number": "376",
    "digits": 2,
    "name": "New Israeli Sheqel"
  },
  {
    "code": "INR",
    "number": "356",
    "digits": 2,
    "name": "Indian Rupee"
  },
  {
    "code": "IQD",
    "number": "368",
    "digits": 3,
    "name": "Iraqi Dinar"
  },
  {
    "code": "IRR",
    "number": "364",
    "digits": 2,
    "name": "Iranian Rial"
  },
  {
    "code": "ISK",
    "number": "352",
    "digits": 0,
    "name": "Iceland Krona"
  },
  {
    "code": "JMD",
    "number": "388",
    "digits": 2,
    "name": "Jamaican Dollar"
  },
  {
    "code": "JOD",
    "number": "400",
    "digits": 3,
    "name": "Jordanian Dinar"
  },
  {
    "code": "JPY",
    "number": "392",
    "digits": 0,
    "name": "Yen"
  },
  {
    "code": "KES",
    "number": "404",
    "digits": 2,
    "name": "Kenyan Shilling"
  },
  {
    "code": "KGS",
    "number": "417",
    "digits": 2,
    "name": "Som"
  },
  {
    "code": "KHR",
    "number": "116",
    "digits": 2,
    "name": "Riel"
  },
  {
    "code": "KMF",
    "number": "174",
    "digits": 0,
    "name": "Comorian Franc "
  },
  {
    "code": "KPW",
    "number": "408",
    "digits": 2,
    "name": "North Korean Won"
  },
  {
    "code": "KRW",
    "number": "410",
    "digits": 0,
    "name": "Won"
  },
  {
    "code": "KWD",
    "number": "414",
    "digits": 3,
    "name": "Kuwaiti Dinar"
  },
  {
    "code": "KYD",
    "number": "136",
    "digits": 2,
    "name": "Cayman Islands Dollar"
  },
  {
    "code": "KZT",
    "number": "398",
    "digits": 2,
    "name": "Tenge"
  },
  {
    "code": "LAK",
    "number": "418",
    "digits": 2,
    "name": "Lao Kip"
  },
  {
    "code": "LBP",
    "number": "422",
    "digits": 2,
    "name": "Lebanese Pound"
  },
  {
    "code": "LKR",
    "number": "144",
    "digits": 2,
    "name": "Sri Lanka Rupee"
  },
  {
    "code": "LRD",
    "number": "430",
    "digits": 2,
    "name": "Liberian Dollar"
  },
  {
    "code": "LSL",
    "number": "426",
    "digits": 2,
    "name": "Loti"
  },
  {
    "code": "LYD",
    "number": "434",
    "digits": 3,
    "name": "Libyan Dinar"
  },
  {
    "code": "MAD",
    "number": "504",
    "digits": 2,
    "name": "Moroccan Dirham"
  },
  {
    "code": "MDL",
    "number": "498",
    "digits": 2,
    "name": "Moldovan Leu"
  },
  {
    "code": "MGA",
    "number": "969",
    "digits": 2,
    "name": "Malagasy Ariary"
  },
  {
    "code": "MKD",
    "number": "807",
    "digits": 2,
    "name": "Denar"
  },
  {
    "code": "MMK",
    "number": "104",
    "digits": 2,
    "name": "Kyat"
  },
  {
    "code": "MNT",
    "number": "496",
    "digits": 2,
    "name": "Tugrik"
  },
  {
    "code": "MOP",
    "number": "446",
    "digits": 2,
    "name": "Pataca"
  },
  {
    "code": "MRU",
    "number": "929",
    "digits": 2,
    "name": "Ouguiya"
  },
  {
    "code": "MUR",
    "number": "480",
    "digits": 2,
    "name": "Mauritius Rupee"
  },
  {
    "code": "MVR",
    "number": "462",
    "digits": 2,
    "name": "Rufiyaa"
  },
  {
    "code": "MWK",
    "number": "454",
    "digits": 2,
    "name": "Malawi Kwacha"
  },
  {
    "code": "MXN",
    "number": "484",
    "digits": 2,
    "name": "Mexican Peso"
  },
  {
    "code": "MXV",
    "number": "979",
    "digits": 2,
    "name": "Mexican Unidad de Inversion (UDI)"
  },
  {
    "code": "MYR",
    "number": "458",
    "digits": 2,
    "name": "Malaysian Ringgit"
  },
  {
    "code": "MZN",
    "number": "943",
    "digits": 2,
    "name": "Mozambique Metical"
  },
  {
    "code": "NAD",
    "number": "516",
    "digits": 2,
    "name": "Namibia Dollar"
  },
  {
    "code": "NGN",
    "number": "566",
    "digits": 2,
    "name": "Naira"
  },
  {
    "code": "NIO",
    "number": "558",
    "digits": 2,
    "name": "Cordoba Oro"
  },
  {
    "code": "NOK",
    "number": "578",
    "digits": 2,
    "name": "Norwegian Krone"
  },
  {
    "code": "NPR",
    "number": "524",
    "digits": 2,
    "name": "Nepalese Rupee"
  },
  {
    "code": "NZD",
    "number": "554",
    "digits": 2,
    "name": "New Zealand Dollar"
  },
  {
    "code": "OMR",
    "number": "512",
    "digits": 3,
    "name": "Rial Omani"
  },
  {
    "code": "PAB",
    "number": "590",
    "digits": 2,
    "name": "Balboa"
  },
  {
    "code": "PEN",
    "number": "604",
    "digits": 2,
    "name": "Sol"
  },
  {
    "code": "PGK",
    "number": "598",
    "digits": 2,
    "name": "Kina"
  },
  {
    "code": "PHP",
    "number": "608",
    "digits": 2,
    "name": "Philippine Peso"
  },
  {
    "code": "PKR",
    "number": "586",
    "digits": 2,
    "name": "Pakistan Rupee"
  },
  {
    "code": "PLN",
    "number": "985",
    "digits": 2,
    "name": "Zloty"
  },
  {
    "code": "PYG",
    "number": "600",
    "digits": 0,
    "name": "Guarani"
  },
  {
    "code": "QAR",
    "number": "634",
    "digits": 2,
    "name": "Qatari Rial"
  },
  {
    "code": "RON",
    "number": "946",
    "digits": 2,
    "name": "Romanian Leu"
  },
  {
    "code": "RSD",
    "number": "941",
    "digits": 2,
    "name": "Serbian Dinar"
  },
  {
    "code": "RUB",
    "number": "643",
    "digits": 2,
    "name": "Russian Ruble"
  },
  {
    "code": "RWF",
    "number": "646",
    "digits": 0,
    "name": "Rwanda Franc"
  },
  {
    "code": "SAR",
    "number": "682",
    "digits": 2,
    "name": "Saudi Riyal"
  },
  {
    "code": "SBD",
    "number": "090",
    "digits": 2,
    "name": "Solomon Islands Dollar"
  },
  {
    "code": "SCR",
    "number": "690",
    "digits": 2,
    "name": "Seychelles Rupee"
  },
  {
    "code": "SDG",
    "number": "938",
    "digits": 2,
    "name": "Sudanese Pound"
  },
  {
    "code": "SEK",
    "number": "752",
    "digits": 2,
    "name": "Swedish Krona"
  },
  {
    "code": "SGD",
    "number": "702",
    "digits": 2,
    "name": "Singapore Dollar"
  },
  {
    "code": "SHP",
    "number": "654",
    "digits": 2,
    "name": "Saint Helena Pound"
  },
  {
    "code": "SLE",
    "number": "925",
    "digits": 2,
    "name": "Leone"
  },
  {
    "code": "SOS",
    "number": "706",
    "digits": 2,
    "name": "Somali Shilling"
  },
  {
    "code": "SRD",
    "number": "968",
    "digits": 2,
    "name": "Surinam Dollar"
  },
  {
    "code": "SSP",
    "number": "728",
    "digits": 2,
    "name": "South Sudanese Pound"
  },
  {
    "code": "STN",
    "number": "930",
    "digits": 2,
    "name": "Dobra"
  },
  {
    "code": "SVC",
    "number": "222",
    "digits": 2,
    "name": "El Salvador Colon"
  },
  {
    "code": "SYP",
    "number": "760",
    "digits": 2,
    "name": "Syrian Pound"
  },
  {
    "code": "SZL",
    "number": "748",
    "digits": 2,
    "name": "Lilangeni"
  },
  {
    "code": "THB",
    "number": "764",
    "digits": 2,
    "name": "Baht"
  },
  {
    "code": "TJS",
    "number": "972",
    "digits": 2,
    "name": "Somoni"
  },
  {
    "code": "TMT",
    "number": "934",
    "digits": 2,
    "name": "Turkmenistan New Manat"
  },
  {
    "code": "TND",
    "number": "788",
    "digits": 3,
    "name": "Tunisian Dinar"
  },
  {
    "code": "TOP",
    "number": "776",
    "digits": 2,
    "name": "Pa’anga"
  },
  {
    "code": "TRY",
    "number": "949",
    "digits": 2,
    "name": "Turkish Lira"
  },
  {
    "code": "TTD",
    "number": "780",
    "digits": 2,
    "name": "Trinidad and Tobago Dollar"
  },
  {
    "code": "TWD",
    "number": "901",
    "digits": 2,
    "name": "New Taiwan Dollar"
  },
  {
    "code": "TZS",
    "number": "834",
    "digits": 2,
    "name": "Tanzanian Shilling"
  },
  {
    "code": "UAH",
    "number": "980",
    "digits": 2,
    "name": "Hryvnia"
  },
  {
    "code": "UGX",
    "number": "800",
    "digits": 0,
    "name": "Uganda Shilling"
  },
  {
    "code": "USD",
    "number": "840",
    "digits": 2,
    "name": "US Dollar"
  },
  {
    "code": "USN",
    "number": "997",
    "digits": 2,
    "name": "US Dollar (Next day)"
  },
  {
    "code": "UYI",
    "number": "940",
    "digits": 0,
    "name": "Uruguay Peso en Unidades Indexadas (UI)"
  },
  {
    "code": "UYU",
    "number": "858",
    "digits": 2,
    "name": "Peso Uruguayo"
  },
  {
    "code": "UYW",
    "number": "927",
    "digits": 4,
    "name": "Unidad Previsional"
  },
  {
    "code": "UZS",
    "number": "860",
    "digits": 2,
    "name": "Uzbekistan Sum"
  },
  {
    "code": "VED",
    "number": "926",
    "digits": 2,
    "name": "Bolívar Soberano"
  },
  {
    "code": "VES",
    "number": "928",
    "digits": 2,
    "name": "Bolívar Soberano"
  },
  {
    "code": "VND",
    "number": "704",
    "digits": 0,
    "name": "Dong"
  },
  {
    "code": "VUV",
    "number": "548",
    "digits": 0,
    "name": "Vatu"
  },
  {
    "code": "WST",
    "number": "882",
    "digits": 2,
    "name": "Tala"
  },
  {
    "code": "XAF",
    "number": "950",
    "digits": 0,
    "name": "CFA Franc BEAC"
  },
  {
    "code": "XAG",
    "number": "961",
    "digits": 0,
    "name": "Silver"
  },
  {
    "code": "XAU",
    "number": "959",
    "digits": 0,
    "name": "Gold"
  },
  {
    "code": "XBA",
    "number": "955",
    "digits": 0,
    "name": "Bond Markets Unit European Composite Unit (EURCO)"
  },
  {
    "code": "XBB",
    "number": "956",
    "digits": 0,
    "name": "Bond Markets Unit European Monetary Unit (E.M.U.-6)"
  },
  {
    "code": "XBC",
    "number": "957",
    "digits": 0,
    "name": "Bond Markets Unit European Unit of Account 9 (E.U.A.-9)"
  },
  {
    "code": "XBD",
    "number": "958",
    "digits": 0,
    "name": "Bond Markets Unit European Unit of Account 17 (E.U.A.-17)"
  },
  {
    "code": "XCD",
    "number": "951",
    "digits": 2,
    "name": "East Caribbean Dollar"
  },
  {
    "code": "XDR",
    "number": "960",
    "digits": 0,
    "name": "SDR (Special Drawing Right)"
  },
  {
    "code": "XOF",
    "number": "952",
    "digits": 0,
    "name": "CFA Franc BCEAO"
  },
  {
    "code": "XPD",
    "number": "964",
    "digits": 0,
    "name": "Palladium"
  },
  {
    "code": "XPF",
    "number": "953",
    "digits": 0,
    "name": "CFP Franc"
  },
  {
    "code": "XPT",
    "number": "962",
    "digits": 0,
    "name": "Platinum"
  },
  {
    "code": "XSU",
    "number": "994",
    "digits": 0,
    "name": "Sucre"
  },
  {
    "code": "XTS",
    "number": "963",
    "digits": 0,
    "name": "Codes specifically reserved for testing purposes"
  },
  {
    "code": "XUA",
    "number": "965",
    "digits": 0,
    "name": "ADB Unit of Account"
  },
  {
    "code": "XXX",
    "number": "999",
    "digits": 0,
    "name": "The codes assigned for transactions where no currency is involved"
  },
  {
    "code": "YER",
    "number": "886",
    "digits": 2,
    "name": "Yemeni Rial"
  },
  {
    "code": "ZAR",
    "number": "710",
    "digits": 2,
    "name": "Rand"
  },
  {
    "code": "ZMW",
    "number": "967",
    "digits": 2,
    "name": "Zambian Kwacha"
  },
  {
    "code": "ZWG",
    "number": "924",
    "digits": 2,
    "name": "Zimbabwe Gold"
  }
];

export const COUNTRY_CATALOG: CountryInfo[] = [
  {
    "code": "AD",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "AE",
    "currencies": [
      "AED"
    ]
  },
  {
    "code": "AF",
    "currencies": [
      "AFN"
    ]
  },
  {
    "code": "AG",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "AI",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "AL",
    "currencies": [
      "ALL"
    ]
  },
  {
    "code": "AM",
    "currencies": [
      "AMD"
    ]
  },
  {
    "code": "AO",
    "currencies": [
      "AOA"
    ]
  },
  {
    "code": "AQ",
    "currencies": []
  },
  {
    "code": "AR",
    "currencies": [
      "ARS"
    ]
  },
  {
    "code": "AS",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "AT",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "AU",
    "currencies": [
      "AUD"
    ]
  },
  {
    "code": "AW",
    "currencies": [
      "AWG"
    ]
  },
  {
    "code": "AX",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "AZ",
    "currencies": [
      "AZN"
    ]
  },
  {
    "code": "BA",
    "currencies": [
      "BAM"
    ]
  },
  {
    "code": "BB",
    "currencies": [
      "BBD"
    ]
  },
  {
    "code": "BD",
    "currencies": [
      "BDT"
    ]
  },
  {
    "code": "BE",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "BF",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "BG",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "BH",
    "currencies": [
      "BHD"
    ]
  },
  {
    "code": "BI",
    "currencies": [
      "BIF"
    ]
  },
  {
    "code": "BJ",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "BL",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "BM",
    "currencies": [
      "BMD"
    ]
  },
  {
    "code": "BN",
    "currencies": [
      "BND",
      "SGD"
    ]
  },
  {
    "code": "BO",
    "currencies": [
      "BOB"
    ]
  },
  {
    "code": "BQ",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "BR",
    "currencies": [
      "BRL"
    ]
  },
  {
    "code": "BS",
    "currencies": [
      "BSD",
      "USD"
    ]
  },
  {
    "code": "BT",
    "currencies": [
      "BTN",
      "INR"
    ]
  },
  {
    "code": "BV",
    "currencies": []
  },
  {
    "code": "BW",
    "currencies": [
      "BWP"
    ]
  },
  {
    "code": "BY",
    "currencies": [
      "BYN"
    ]
  },
  {
    "code": "BZ",
    "currencies": [
      "BZD"
    ]
  },
  {
    "code": "CA",
    "currencies": [
      "CAD"
    ]
  },
  {
    "code": "CC",
    "currencies": [
      "AUD"
    ]
  },
  {
    "code": "CD",
    "currencies": [
      "CDF"
    ]
  },
  {
    "code": "CF",
    "currencies": [
      "XAF"
    ]
  },
  {
    "code": "CG",
    "currencies": [
      "XAF"
    ]
  },
  {
    "code": "CH",
    "currencies": [
      "CHF"
    ]
  },
  {
    "code": "CI",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "CK",
    "currencies": [
      "NZD"
    ]
  },
  {
    "code": "CL",
    "currencies": [
      "CLP"
    ]
  },
  {
    "code": "CM",
    "currencies": [
      "XAF"
    ]
  },
  {
    "code": "CN",
    "currencies": [
      "CNY"
    ]
  },
  {
    "code": "CO",
    "currencies": [
      "COP"
    ]
  },
  {
    "code": "CR",
    "currencies": [
      "CRC"
    ]
  },
  {
    "code": "CU",
    "currencies": [
      "CUP"
    ]
  },
  {
    "code": "CV",
    "currencies": [
      "CVE"
    ]
  },
  {
    "code": "CW",
    "currencies": []
  },
  {
    "code": "CX",
    "currencies": [
      "AUD"
    ]
  },
  {
    "code": "CY",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "CZ",
    "currencies": [
      "CZK"
    ]
  },
  {
    "code": "DE",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "DJ",
    "currencies": [
      "DJF"
    ]
  },
  {
    "code": "DK",
    "currencies": [
      "DKK"
    ]
  },
  {
    "code": "DM",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "DO",
    "currencies": [
      "DOP"
    ]
  },
  {
    "code": "DZ",
    "currencies": [
      "DZD"
    ]
  },
  {
    "code": "EC",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "EE",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "EG",
    "currencies": [
      "EGP"
    ]
  },
  {
    "code": "EH",
    "currencies": [
      "DZD",
      "MAD",
      "MRU"
    ]
  },
  {
    "code": "ER",
    "currencies": [
      "ERN"
    ]
  },
  {
    "code": "ES",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "ET",
    "currencies": [
      "ETB"
    ]
  },
  {
    "code": "FI",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "FJ",
    "currencies": [
      "FJD"
    ]
  },
  {
    "code": "FK",
    "currencies": [
      "FKP"
    ]
  },
  {
    "code": "FM",
    "currencies": []
  },
  {
    "code": "FO",
    "currencies": [
      "DKK"
    ]
  },
  {
    "code": "FR",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "GA",
    "currencies": [
      "XAF"
    ]
  },
  {
    "code": "GB",
    "currencies": [
      "GBP"
    ]
  },
  {
    "code": "GD",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "GE",
    "currencies": [
      "GEL"
    ]
  },
  {
    "code": "GF",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "GG",
    "currencies": [
      "GBP"
    ]
  },
  {
    "code": "GH",
    "currencies": [
      "GHS"
    ]
  },
  {
    "code": "GI",
    "currencies": [
      "GIP"
    ]
  },
  {
    "code": "GL",
    "currencies": [
      "DKK"
    ]
  },
  {
    "code": "GM",
    "currencies": [
      "GMD"
    ]
  },
  {
    "code": "GN",
    "currencies": [
      "GNF"
    ]
  },
  {
    "code": "GP",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "GQ",
    "currencies": [
      "XAF"
    ]
  },
  {
    "code": "GR",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "GS",
    "currencies": [
      "SHP"
    ]
  },
  {
    "code": "GT",
    "currencies": [
      "GTQ"
    ]
  },
  {
    "code": "GU",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "GW",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "GY",
    "currencies": [
      "GYD"
    ]
  },
  {
    "code": "HK",
    "currencies": [
      "HKD"
    ]
  },
  {
    "code": "HM",
    "currencies": []
  },
  {
    "code": "HN",
    "currencies": [
      "HNL"
    ]
  },
  {
    "code": "HR",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "HT",
    "currencies": [
      "HTG"
    ]
  },
  {
    "code": "HU",
    "currencies": [
      "HUF"
    ]
  },
  {
    "code": "ID",
    "currencies": [
      "IDR"
    ]
  },
  {
    "code": "IE",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "IL",
    "currencies": [
      "ILS"
    ]
  },
  {
    "code": "IM",
    "currencies": [
      "GBP"
    ]
  },
  {
    "code": "IN",
    "currencies": [
      "INR"
    ]
  },
  {
    "code": "IO",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "IQ",
    "currencies": [
      "IQD"
    ]
  },
  {
    "code": "IR",
    "currencies": [
      "IRR"
    ]
  },
  {
    "code": "IS",
    "currencies": [
      "ISK"
    ]
  },
  {
    "code": "IT",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "JE",
    "currencies": [
      "GBP"
    ]
  },
  {
    "code": "JM",
    "currencies": [
      "JMD"
    ]
  },
  {
    "code": "JO",
    "currencies": [
      "JOD"
    ]
  },
  {
    "code": "JP",
    "currencies": [
      "JPY"
    ]
  },
  {
    "code": "KE",
    "currencies": [
      "KES"
    ]
  },
  {
    "code": "KG",
    "currencies": [
      "KGS"
    ]
  },
  {
    "code": "KH",
    "currencies": [
      "KHR",
      "USD"
    ]
  },
  {
    "code": "KI",
    "currencies": [
      "AUD"
    ]
  },
  {
    "code": "KM",
    "currencies": [
      "KMF"
    ]
  },
  {
    "code": "KN",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "KP",
    "currencies": [
      "KPW"
    ]
  },
  {
    "code": "KR",
    "currencies": [
      "KRW"
    ]
  },
  {
    "code": "KW",
    "currencies": [
      "KWD"
    ]
  },
  {
    "code": "KY",
    "currencies": [
      "KYD"
    ]
  },
  {
    "code": "KZ",
    "currencies": [
      "KZT"
    ]
  },
  {
    "code": "LA",
    "currencies": [
      "LAK"
    ]
  },
  {
    "code": "LB",
    "currencies": [
      "LBP"
    ]
  },
  {
    "code": "LC",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "LI",
    "currencies": [
      "CHF"
    ]
  },
  {
    "code": "LK",
    "currencies": [
      "LKR"
    ]
  },
  {
    "code": "LR",
    "currencies": [
      "LRD"
    ]
  },
  {
    "code": "LS",
    "currencies": [
      "LSL",
      "ZAR"
    ]
  },
  {
    "code": "LT",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "LU",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "LV",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "LY",
    "currencies": [
      "LYD"
    ]
  },
  {
    "code": "MA",
    "currencies": [
      "MAD"
    ]
  },
  {
    "code": "MC",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "MD",
    "currencies": [
      "MDL"
    ]
  },
  {
    "code": "ME",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "MF",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "MG",
    "currencies": [
      "MGA"
    ]
  },
  {
    "code": "MH",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "MK",
    "currencies": [
      "MKD"
    ]
  },
  {
    "code": "ML",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "MM",
    "currencies": [
      "MMK"
    ]
  },
  {
    "code": "MN",
    "currencies": [
      "MNT"
    ]
  },
  {
    "code": "MO",
    "currencies": [
      "MOP"
    ]
  },
  {
    "code": "MP",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "MQ",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "MR",
    "currencies": [
      "MRU"
    ]
  },
  {
    "code": "MS",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "MT",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "MU",
    "currencies": [
      "MUR"
    ]
  },
  {
    "code": "MV",
    "currencies": [
      "MVR"
    ]
  },
  {
    "code": "MW",
    "currencies": [
      "MWK"
    ]
  },
  {
    "code": "MX",
    "currencies": [
      "MXN"
    ]
  },
  {
    "code": "MY",
    "currencies": [
      "MYR"
    ]
  },
  {
    "code": "MZ",
    "currencies": [
      "MZN"
    ]
  },
  {
    "code": "NA",
    "currencies": [
      "NAD",
      "ZAR"
    ]
  },
  {
    "code": "NC",
    "currencies": [
      "XPF"
    ]
  },
  {
    "code": "NE",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "NF",
    "currencies": [
      "AUD"
    ]
  },
  {
    "code": "NG",
    "currencies": [
      "NGN"
    ]
  },
  {
    "code": "NI",
    "currencies": [
      "NIO"
    ]
  },
  {
    "code": "NL",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "NO",
    "currencies": [
      "NOK"
    ]
  },
  {
    "code": "NP",
    "currencies": [
      "NPR"
    ]
  },
  {
    "code": "NR",
    "currencies": [
      "AUD"
    ]
  },
  {
    "code": "NU",
    "currencies": [
      "NZD"
    ]
  },
  {
    "code": "NZ",
    "currencies": [
      "NZD"
    ]
  },
  {
    "code": "OM",
    "currencies": [
      "OMR"
    ]
  },
  {
    "code": "PA",
    "currencies": [
      "PAB",
      "USD"
    ]
  },
  {
    "code": "PE",
    "currencies": [
      "PEN"
    ]
  },
  {
    "code": "PF",
    "currencies": [
      "XPF"
    ]
  },
  {
    "code": "PG",
    "currencies": [
      "PGK"
    ]
  },
  {
    "code": "PH",
    "currencies": [
      "PHP"
    ]
  },
  {
    "code": "PK",
    "currencies": [
      "PKR"
    ]
  },
  {
    "code": "PL",
    "currencies": [
      "PLN"
    ]
  },
  {
    "code": "PM",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "PN",
    "currencies": [
      "NZD"
    ]
  },
  {
    "code": "PR",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "PS",
    "currencies": [
      "EGP",
      "ILS",
      "JOD"
    ]
  },
  {
    "code": "PT",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "PW",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "PY",
    "currencies": [
      "PYG"
    ]
  },
  {
    "code": "QA",
    "currencies": [
      "QAR"
    ]
  },
  {
    "code": "RE",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "RO",
    "currencies": [
      "RON"
    ]
  },
  {
    "code": "RS",
    "currencies": [
      "RSD"
    ]
  },
  {
    "code": "RU",
    "currencies": [
      "RUB"
    ]
  },
  {
    "code": "RW",
    "currencies": [
      "RWF"
    ]
  },
  {
    "code": "SA",
    "currencies": [
      "SAR"
    ]
  },
  {
    "code": "SB",
    "currencies": [
      "SBD"
    ]
  },
  {
    "code": "SC",
    "currencies": [
      "SCR"
    ]
  },
  {
    "code": "SD",
    "currencies": [
      "SDG"
    ]
  },
  {
    "code": "SE",
    "currencies": [
      "SEK"
    ]
  },
  {
    "code": "SG",
    "currencies": [
      "SGD"
    ]
  },
  {
    "code": "SH",
    "currencies": [
      "GBP",
      "SHP"
    ]
  },
  {
    "code": "SI",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "SJ",
    "currencies": [
      "NOK"
    ]
  },
  {
    "code": "SK",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "SL",
    "currencies": [
      "SLE"
    ]
  },
  {
    "code": "SM",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "SN",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "SO",
    "currencies": [
      "SOS"
    ]
  },
  {
    "code": "SR",
    "currencies": [
      "SRD"
    ]
  },
  {
    "code": "SS",
    "currencies": [
      "SSP"
    ]
  },
  {
    "code": "ST",
    "currencies": [
      "STN"
    ]
  },
  {
    "code": "SV",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "SX",
    "currencies": []
  },
  {
    "code": "SY",
    "currencies": [
      "SYP"
    ]
  },
  {
    "code": "SZ",
    "currencies": [
      "SZL",
      "ZAR"
    ]
  },
  {
    "code": "TC",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "TD",
    "currencies": [
      "XAF"
    ]
  },
  {
    "code": "TF",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "TG",
    "currencies": [
      "XOF"
    ]
  },
  {
    "code": "TH",
    "currencies": [
      "THB"
    ]
  },
  {
    "code": "TJ",
    "currencies": [
      "TJS"
    ]
  },
  {
    "code": "TK",
    "currencies": [
      "NZD"
    ]
  },
  {
    "code": "TL",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "TM",
    "currencies": [
      "TMT"
    ]
  },
  {
    "code": "TN",
    "currencies": [
      "TND"
    ]
  },
  {
    "code": "TO",
    "currencies": [
      "TOP"
    ]
  },
  {
    "code": "TR",
    "currencies": [
      "TRY"
    ]
  },
  {
    "code": "TT",
    "currencies": [
      "TTD"
    ]
  },
  {
    "code": "TV",
    "currencies": [
      "AUD"
    ]
  },
  {
    "code": "TW",
    "currencies": [
      "TWD"
    ]
  },
  {
    "code": "TZ",
    "currencies": [
      "TZS"
    ]
  },
  {
    "code": "UA",
    "currencies": [
      "UAH"
    ]
  },
  {
    "code": "UG",
    "currencies": [
      "UGX"
    ]
  },
  {
    "code": "UM",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "US",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "UY",
    "currencies": [
      "UYU"
    ]
  },
  {
    "code": "UZ",
    "currencies": [
      "UZS"
    ]
  },
  {
    "code": "VA",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "VC",
    "currencies": [
      "XCD"
    ]
  },
  {
    "code": "VE",
    "currencies": [
      "VES"
    ]
  },
  {
    "code": "VG",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "VI",
    "currencies": [
      "USD"
    ]
  },
  {
    "code": "VN",
    "currencies": [
      "VND"
    ]
  },
  {
    "code": "VU",
    "currencies": [
      "VUV"
    ]
  },
  {
    "code": "WF",
    "currencies": [
      "XPF"
    ]
  },
  {
    "code": "WS",
    "currencies": [
      "WST"
    ]
  },
  {
    "code": "XK",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "YE",
    "currencies": [
      "YER"
    ]
  },
  {
    "code": "YT",
    "currencies": [
      "EUR"
    ]
  },
  {
    "code": "ZA",
    "currencies": [
      "ZAR"
    ]
  },
  {
    "code": "ZM",
    "currencies": [
      "ZMW"
    ]
  },
  {
    "code": "ZW",
    "currencies": [
      "BWP",
      "CNY",
      "EUR",
      "GBP",
      "INR",
      "JPY",
      "USD",
      "ZAR",
      "ZWG"
    ]
  }
];
