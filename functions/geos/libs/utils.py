def convert_to_hashes(arr):
    hashes_arr = []
    for inner_arr in arr:
        hash_dict = {inner_arr[0]: inner_arr[1]}
        hashes_arr.append(hash_dict)
    return hashes_arr


COUNTRIES = [
    {"geo": "ALL", "num_origins": "9731427"},
    {"geo": "United States of America", "num_origins": "1707677"},
    {"geo": "India", "num_origins": "826143"},
    {"geo": "Japan", "num_origins": "690984"},
    {"geo": "Germany", "num_origins": "678201"},
    {"geo": "Brazil", "num_origins": "644760"},
    {
        "geo": "United Kingdom of Great Britain and Northern Ireland",
        "num_origins": "560753",
    },
    {"geo": "Russian Federation", "num_origins": "529803"},
    {"geo": "France", "num_origins": "515925"},
    {"geo": "Italy", "num_origins": "503015"},
    {"geo": "Spain", "num_origins": "459739"},
    {"geo": "Indonesia", "num_origins": "401253"},
    {"geo": "Poland", "num_origins": "350837"},
    {"geo": "Canada", "num_origins": "335548"},
    {"geo": "Mexico", "num_origins": "317337"},
    {"geo": "Turkey", "num_origins": "292310"},
    {"geo": "Netherlands", "num_origins": "291785"},
    {"geo": "Argentina", "num_origins": "252487"},
    {"geo": "Australia", "num_origins": "215909"},
    {"geo": "Korea, Republic of", "num_origins": "209013"},
    {"geo": "Philippines", "num_origins": "204637"},
    {"geo": "Colombia", "num_origins": "198020"},
    {"geo": "Malaysia", "num_origins": "193444"},
    {"geo": "Ukraine", "num_origins": "189866"},
    {"geo": "Viet Nam", "num_origins": "176473"},
    {"geo": "Thailand", "num_origins": "167337"},
    {"geo": "Pakistan", "num_origins": "157400"},
    {"geo": "Belgium", "num_origins": "157266"},
    {"geo": "South Africa", "num_origins": "150004"},
    {"geo": "Czechia", "num_origins": "148638"},
    {"geo": "Romania", "num_origins": "148176"},
    {"geo": "Taiwan, Province of China", "num_origins": "147383"},
    {"geo": "Chile", "num_origins": "144592"},
    {"geo": "Greece", "num_origins": "135996"},
    {"geo": "Austria", "num_origins": "135821"},
    {"geo": "Bangladesh", "num_origins": "134081"},
    {"geo": "Peru", "num_origins": "124954"},
    {"geo": "Iran (Islamic Republic of)", "num_origins": "122949"},
    {"geo": "Singapore", "num_origins": "121397"},
    {"geo": "Egypt", "num_origins": "119105"},
    {"geo": "Hungary", "num_origins": "117857"},
    {"geo": "Nigeria", "num_origins": "115407"},
    {"geo": "Portugal", "num_origins": "113035"},
    {"geo": "Kazakhstan", "num_origins": "111471"},
    {"geo": "Belarus", "num_origins": "109161"},
    {"geo": "Sweden", "num_origins": "108230"},
    {"geo": "Switzerland", "num_origins": "106121"},
    {"geo": "Saudi Arabia", "num_origins": "100966"},
    {"geo": "Israel", "num_origins": "99539"},
    {"geo": "Algeria", "num_origins": "98160"},
    {"geo": "Morocco", "num_origins": "96973"},
    {"geo": "Ireland", "num_origins": "96613"},
    {"geo": "Hong Kong", "num_origins": "95717"},
    {"geo": "United Arab Emirates", "num_origins": "91116"},
    {"geo": "Croatia", "num_origins": "85514"},
    {"geo": "Venezuela (Bolivarian Republic of)", "num_origins": "84283"},
    {"geo": "Slovakia", "num_origins": "84177"},
    {"geo": "Finland", "num_origins": "83107"},
    {"geo": "Serbia", "num_origins": "80789"},
    {"geo": "Ecuador", "num_origins": "80083"},
    {"geo": "Bulgaria", "num_origins": "75818"},
    {"geo": "Denmark", "num_origins": "69550"},
    {"geo": "New Zealand", "num_origins": "68444"},
    {"geo": "Uzbekistan", "num_origins": "65735"},
    {"geo": "Iraq", "num_origins": "65305"},
    {"geo": "Kenya", "num_origins": "62330"},
    {"geo": "Nepal", "num_origins": "60371"},
    {"geo": "Norway", "num_origins": "58300"},
    {"geo": "China", "num_origins": "57495"},
    {"geo": "Bolivia (Plurinational State of)", "num_origins": "55245"},
    {"geo": "Tunisia", "num_origins": "54813"},
    {"geo": "Sri Lanka", "num_origins": "53879"},
    {"geo": "Guatemala", "num_origins": "50897"},
    {"geo": "Azerbaijan", "num_origins": "46317"},
    {"geo": "Kyrgyzstan", "num_origins": "45478"},
    {"geo": "Lithuania", "num_origins": "45215"},
    {"geo": "Costa Rica", "num_origins": "44736"},
    {"geo": "Dominican Republic", "num_origins": "42618"},
    {"geo": "Moldova, Republic of", "num_origins": "41976"},
    {"geo": "Bosnia and Herzegovina", "num_origins": "41953"},
    {"geo": "Jordan", "num_origins": "41773"},
    {"geo": "Uruguay", "num_origins": "41139"},
    {"geo": "Panama", "num_origins": "38437"},
    {"geo": "Slovenia", "num_origins": "36027"},
    {"geo": "Ghana", "num_origins": "35980"},
    {"geo": "Paraguay", "num_origins": "35415"},
    {"geo": "Georgia", "num_origins": "34921"},
    {"geo": "Qatar", "num_origins": "34403"},
    {"geo": "Lebanon", "num_origins": "33694"},
    {"geo": "Puerto Rico", "num_origins": "33617"},
    {"geo": "El Salvador", "num_origins": "31654"},
    {"geo": "Syrian Arab Republic", "num_origins": "30714"},
    {"geo": "Latvia", "num_origins": "30530"},
    {"geo": "Honduras", "num_origins": "29712"},
    {"geo": "Myanmar", "num_origins": "29348"},
    {"geo": "Cyprus", "num_origins": "29012"},
    {"geo": "Oman", "num_origins": "27345"},
    {"geo": "Tanzania, United Republic of", "num_origins": "27335"},
    {"geo": "Cameroon", "num_origins": "26828"},
    {"geo": "Kuwait", "num_origins": "26458"},
    {"geo": "Armenia", "num_origins": "26355"},
    {"geo": "Nicaragua", "num_origins": "26015"},
    {"geo": "Estonia", "num_origins": "25576"},
    {"geo": "Côte d'Ivoire", "num_origins": "25208"},
    {"geo": "Cambodia", "num_origins": "24593"},
    {"geo": "Uganda", "num_origins": "24532"},
    {"geo": "Libya", "num_origins": "23730"},
    {"geo": "Cuba", "num_origins": "23056"},
    {"geo": "Ethiopia", "num_origins": "22650"},
    {"geo": "Albania", "num_origins": "22445"},
    {"geo": "Yemen", "num_origins": "22186"},
    {"geo": "North Macedonia", "num_origins": "21259"},
    {"geo": "Palestine, State of", "num_origins": "20468"},
    {"geo": "Senegal", "num_origins": "20323"},
    {"geo": "Montenegro", "num_origins": "20212"},
    {"geo": "Sudan", "num_origins": "20152"},
    {"geo": "Jamaica", "num_origins": "18847"},
    {"geo": "Iceland", "num_origins": "18261"},
    {"geo": "Zambia", "num_origins": "17567"},
    {"geo": "Bahrain", "num_origins": "17522"},
    {"geo": "Réunion", "num_origins": "17251"},
    {"geo": "Trinidad and Tobago", "num_origins": "16445"},
    {"geo": "Mauritius", "num_origins": "16238"},
    {"geo": "Zimbabwe", "num_origins": "15515"},
    {"geo": "Tajikistan", "num_origins": "14835"},
    {"geo": "Lao People's Democratic Republic", "num_origins": "14796"},
    {"geo": "Luxembourg", "num_origins": "14647"},
    {"geo": "Congo, Democratic Republic of the", "num_origins": "14545"},
    {"geo": "Angola", "num_origins": "13428"},
    {"geo": "Haiti", "num_origins": "13083"},
    {"geo": "Malta", "num_origins": "12984"},
    {"geo": "Mozambique", "num_origins": "12706"},
    {"geo": "Mongolia", "num_origins": "12574"},
    {"geo": "Burkina Faso", "num_origins": "12325"},
    {"geo": "Benin", "num_origins": "12292"},
    {"geo": "Somalia", "num_origins": "12176"},
    {"geo": "Mali", "num_origins": "10834"},
    {"geo": "Turkmenistan", "num_origins": "10192"},
    {"geo": "Afghanistan", "num_origins": "9613"},
    {"geo": "Martinique", "num_origins": "9314"},
    {"geo": "Guadeloupe", "num_origins": "8961"},
    {"geo": "Brunei Darussalam", "num_origins": "8854"},
    {"geo": "Botswana", "num_origins": "8657"},
    {"geo": "Namibia", "num_origins": "8535"},
    {"geo": "Papua New Guinea", "num_origins": "8447"},
    {"geo": "Togo", "num_origins": "8308"},
    {"geo": "Malawi", "num_origins": "8305"},
    {"geo": "Maldives", "num_origins": "8262"},
    {"geo": "Kosovo", "num_origins": "7807"},
    {"geo": "Gabon", "num_origins": "7754"},
    {"geo": "Bhutan", "num_origins": "6919"},
    {"geo": "Guinea", "num_origins": "6702"},
    {"geo": "Madagascar", "num_origins": "6620"},
    {"geo": "Guyana", "num_origins": "6303"},
    {"geo": "Rwanda", "num_origins": "6129"},
    {"geo": "Mauritania", "num_origins": "5995"},
    {"geo": "Macao", "num_origins": "5889"},
    {"geo": "Suriname", "num_origins": "5827"},
    {"geo": "Niger", "num_origins": "5484"},
    {"geo": "Fiji", "num_origins": "5388"},
    {"geo": "Congo", "num_origins": "4697"},
    {"geo": "Barbados", "num_origins": "4509"},
    {"geo": "Bahamas", "num_origins": "4467"},
    {"geo": "Chad", "num_origins": "4426"},
    {"geo": "Sierra Leone", "num_origins": "4345"},
    {"geo": "Cabo Verde", "num_origins": "4125"},
    {"geo": "Liberia", "num_origins": "3899"},
    {"geo": "Belize", "num_origins": "3871"},
    {"geo": "French Guiana", "num_origins": "3603"},
    {"geo": "Eswatini", "num_origins": "3554"},
    {"geo": "French Polynesia", "num_origins": "3489"},
    {"geo": "New Caledonia", "num_origins": "3379"},
    {"geo": "Lesotho", "num_origins": "3265"},
    {"geo": "Gambia", "num_origins": "3217"},
    {"geo": "Timor-Leste", "num_origins": "3074"},
    {"geo": "Andorra", "num_origins": "3073"},
    {"geo": "South Sudan", "num_origins": "3040"},
    {"geo": "Curaçao", "num_origins": "2987"},
    {"geo": "Western Sahara", "num_origins": "2739"},
    {"geo": "Saint Lucia", "num_origins": "2493"},
    {"geo": "Guam", "num_origins": "2466"},
    {"geo": "Antigua and Barbuda", "num_origins": "2449"},
    {"geo": "Aruba", "num_origins": "2420"},
    {"geo": "Djibouti", "num_origins": "2395"},
    {"geo": "Burundi", "num_origins": "2301"},
    {"geo": "Seychelles", "num_origins": "2007"},
    {"geo": "Mayotte", "num_origins": "1820"},
    {"geo": "Grenada", "num_origins": "1597"},
    {"geo": "Guinea-Bissau", "num_origins": "1592"},
    {"geo": "Comoros", "num_origins": "1563"},
    {"geo": "Cayman Islands", "num_origins": "1549"},
    {"geo": "Jersey", "num_origins": "1499"},
    {"geo": "Saint Vincent and the Grenadines", "num_origins": "1453"},
    {"geo": "Isle of Man", "num_origins": "1374"},
    {"geo": "Faroe Islands", "num_origins": "1233"},
    {"geo": "Equatorial Guinea", "num_origins": "1218"},
    {"geo": "Virgin Islands (U.S.)", "num_origins": "1074"},
    {"geo": "Dominica", "num_origins": "1049"},
    {"geo": "Sint Maarten (Dutch part)", "num_origins": "952"},
    {"geo": "Solomon Islands", "num_origins": "946"},
    {"geo": "Guernsey", "num_origins": "936"},
    {"geo": "Saint Kitts and Nevis", "num_origins": "917"},
    {"geo": "Central African Republic", "num_origins": "879"},
    {"geo": "Virgin Islands (British)", "num_origins": "864"},
    {"geo": "San Marino", "num_origins": "845"},
    {"geo": "Bermuda", "num_origins": "796"},
    {"geo": "Samoa", "num_origins": "771"},
    {"geo": "Gibraltar", "num_origins": "710"},
    {"geo": "Vanuatu", "num_origins": "697"},
    {"geo": "Saint Martin (French part)", "num_origins": "642"},
    {"geo": "Greenland", "num_origins": "631"},
    {"geo": "Bonaire, Sint Eustatius and Saba", "num_origins": "615"},
    {"geo": "Marshall Islands", "num_origins": "604"},
    {"geo": "Turks and Caicos Islands", "num_origins": "548"},
]
