export interface CountryOperatorItem {
  id: string;
  name: string; // e.g. "Afghanistan - AWCC"
  country: string; // "Afghanistan"
  operator: string; // "AWCC"
  code: string; // "93"
  ranges: string[]; // ["9370", "9371", "9372", "9373", "9374"]
}

export const COUNTRY_OPERATOR_LIST: CountryOperatorItem[] = [
  { id: 'af_awcc', name: 'Afghanistan - AWCC', country: 'Afghanistan', operator: 'AWCC', code: '93', ranges: ['9370', '9371', '93700', '93701'] },
  { id: 'af_etisalat', name: 'Afghanistan - Etisalat', country: 'Afghanistan', operator: 'Etisalat', code: '93', ranges: ['9378', '93780', '93781', '93782'] },
  { id: 'af_mobile', name: 'Afghanistan - Mobile', country: 'Afghanistan', operator: 'Mobile', code: '93', ranges: ['9370', '9378', '9379', '9377'] },
  { id: 'af_mtn', name: 'Afghanistan - MTN', country: 'Afghanistan', operator: 'MTN', code: '93', ranges: ['9377', '93770', '93771', '93772'] },
  { id: 'af_roshan', name: 'Afghanistan - Roshan', country: 'Afghanistan', operator: 'Roshan', code: '93', ranges: ['9379', '93790', '93791', '93792'] },
  { id: 'af_salaam', name: 'Afghanistan - Salaam', country: 'Afghanistan', operator: 'Salaam', code: '93', ranges: ['9374', '93744', '93745', '93747'] },

  { id: 'al_eagle', name: 'Albania - Eagle Mobile', country: 'Albania', operator: 'Eagle Mobile', code: '355', ranges: ['35567', '355672', '355673'] },
  { id: 'al_mobile', name: 'Albania - Mobile', country: 'Albania', operator: 'Mobile', code: '355', ranges: ['35568', '35569', '35567'] },
  { id: 'al_plus', name: 'Albania - Plus Communication', country: 'Albania', operator: 'Plus Communication', code: '355', ranges: ['35566', '355662'] },
  { id: 'al_telekom', name: 'Albania - Telekom', country: 'Albania', operator: 'Telekom', code: '355', ranges: ['35568', '355682', '355683'] },
  { id: 'al_vodafone', name: 'Albania - Vodafone', country: 'Albania', operator: 'Vodafone', code: '355', ranges: ['35569', '355692', '355694'] },

  { id: 'dz_djezzy', name: 'Algeria - Djezzy', country: 'Algeria', operator: 'Djezzy', code: '213', ranges: ['21377', '21378', '21379'] },
  { id: 'dz_mobile', name: 'Algeria - Mobile', country: 'Algeria', operator: 'Mobile', code: '213', ranges: ['21366', '21377', '21355'] },
  { id: 'dz_mobilis', name: 'Algeria - Mobilis', country: 'Algeria', operator: 'Mobilis', code: '213', ranges: ['21366', '21367', '21368'] },
  { id: 'dz_ooredoo', name: 'Algeria - Ooredoo', country: 'Algeria', operator: 'Ooredoo', code: '213', ranges: ['21355', '21356', '21354'] },

  { id: 'as_bluesky', name: 'American Samoa - BlueSky', country: 'American Samoa', operator: 'BlueSky', code: '1684', ranges: ['1684733', '1684731'] },
  { id: 'ad_mobiland', name: 'Andorra - Mobiland', country: 'Andorra', operator: 'Mobiland', code: '376', ranges: ['3763', '3766', '3768'] },
  { id: 'ad_mobile', name: 'Andorra - Mobile', country: 'Andorra', operator: 'Mobile', code: '376', ranges: ['3763', '3764', '3766'] },

  { id: 'ao_mobile', name: 'Angola - Mobile', country: 'Angola', operator: 'Mobile', code: '244', ranges: ['24492', '24493', '24494'] },
  { id: 'ao_movicel', name: 'Angola - Movicel', country: 'Angola', operator: 'Movicel', code: '244', ranges: ['24491', '24499'] },
  { id: 'ao_unitel', name: 'Angola - Unitel', country: 'Angola', operator: 'Unitel', code: '244', ranges: ['24492', '24493', '24494'] },

  { id: 'ai_flow', name: 'Anguilla - Flow', country: 'Anguilla', operator: 'Flow', code: '1264', ranges: ['1264476', '1264235'] },
  { id: 'ag_imobile', name: 'Antigua and Barbuda - iMobile (APUA)', country: 'Antigua and Barbuda', operator: 'iMobile (APUA)', code: '1268', ranges: ['1268720', '1268770'] },
  { id: 'ar_mobile', name: 'Argentina - Mobile', country: 'Argentina', operator: 'Mobile', code: '54', ranges: ['54911', '54935', '54934'] },

  { id: 'am_beeline', name: 'Armenia - Beeline', country: 'Armenia', operator: 'Beeline', code: '374', ranges: ['37491', '37496', '37499'] },
  { id: 'am_mobile', name: 'Armenia - Mobile', country: 'Armenia', operator: 'Mobile', code: '374', ranges: ['37477', '37493', '37494'] },
  { id: 'am_ucom', name: 'Armenia - Ucom', country: 'Armenia', operator: 'Ucom', code: '374', ranges: ['37441', '37444', '37455'] },
  { id: 'am_vivacell', name: 'Armenia - VivaCell-MTS', country: 'Armenia', operator: 'VivaCell-MTS', code: '374', ranges: ['37493', '37494', '37477'] },

  { id: 'aw_digicel', name: 'Aruba - Digicel', country: 'Aruba', operator: 'Digicel', code: '297', ranges: ['29773', '29774'] },
  { id: 'aw_mobile', name: 'Aruba - Mobile', country: 'Aruba', operator: 'Mobile', code: '297', ranges: ['29759', '29773'] },
  { id: 'aw_setar', name: 'Aruba - Setar', country: 'Aruba', operator: 'Setar', code: '297', ranges: ['29756', '29759'] },

  { id: 'au_mobile', name: 'Australia - Mobile', country: 'Australia', operator: 'Mobile', code: '61', ranges: ['6141', '6142', '6143', '6145'] },
  { id: 'au_optus', name: 'Australia - Optus', country: 'Australia', operator: 'Optus', code: '61', ranges: ['6140', '6141', '6142'] },
  { id: 'au_telstra', name: 'Australia - Telstra', country: 'Australia', operator: 'Telstra', code: '61', ranges: ['6147', '6148', '6149'] },
  { id: 'au_vodafone', name: 'Australia - Vodafone', country: 'Australia', operator: 'Vodafone', code: '61', ranges: ['6145', '6146', '6143'] },

  { id: 'at_mobile', name: 'Austria - Mobile', country: 'Austria', operator: 'Mobile', code: '43', ranges: ['43660', '43676', '43699'] },

  { id: 'az_azercell', name: 'Azerbaijan - Azercell', country: 'Azerbaijan', operator: 'Azercell', code: '994', ranges: ['99450', '99451'] },
  { id: 'az_bakcell', name: 'Azerbaijan - Bakcell', country: 'Azerbaijan', operator: 'Bakcell', code: '994', ranges: ['99455', '99499'] },
  { id: 'az_mobile', name: 'Azerbaijan - Mobile', country: 'Azerbaijan', operator: 'Mobile', code: '994', ranges: ['99450', '99455', '99470'] },
  { id: 'az_nar', name: 'Azerbaijan - Nar Mobile', country: 'Azerbaijan', operator: 'Nar Mobile', code: '994', ranges: ['99470', '99477'] },

  { id: 'bs_aliv', name: 'Bahamas - Aliv', country: 'Bahamas', operator: 'Aliv', code: '1242', ranges: ['1242801', '1242802'] },
  { id: 'bs_btc', name: 'Bahamas - Bahamas Telecommunications Company (BTC)', country: 'Bahamas', operator: 'BTC', code: '1242', ranges: ['1242357', '1242359'] },

  { id: 'bh_batelco', name: 'Bahrain - Batelco', country: 'Bahrain', operator: 'Batelco', code: '973', ranges: ['97339', '97338'] },
  { id: 'bh_mobile', name: 'Bahrain - Mobile', country: 'Bahrain', operator: 'Mobile', code: '973', ranges: ['97333', '97336', '97339'] },

  { id: 'bd_banglalink', name: 'Bangladesh - Banglalink', country: 'Bangladesh', operator: 'Banglalink', code: '880', ranges: ['88019', '88014'] },
  { id: 'bd_citycell', name: 'Bangladesh - Citycell', country: 'Bangladesh', operator: 'Citycell', code: '880', ranges: ['88011'] },
  { id: 'bd_gp', name: 'Bangladesh - GrameenPhone', country: 'Bangladesh', operator: 'GrameenPhone', code: '880', ranges: ['88017', '88013'] },
  { id: 'bd_mobile', name: 'Bangladesh - Mobile', country: 'Bangladesh', operator: 'Mobile', code: '880', ranges: ['88017', '88019', '88018', '88016', '88015'] },
  { id: 'bd_robi', name: 'Bangladesh - Robi', country: 'Bangladesh', operator: 'Robi', code: '880', ranges: ['88018'] },
  { id: 'bd_airtel', name: 'Bangladesh - Robi (formerly Airtel)', country: 'Bangladesh', operator: 'Robi (formerly Airtel)', code: '880', ranges: ['88016'] },
  { id: 'bd_teletalk', name: 'Bangladesh - TeleTalk', country: 'Bangladesh', operator: 'TeleTalk', code: '880', ranges: ['88015'] },

  { id: 'bb_digicel', name: 'Barbados - Digicel', country: 'Barbados', operator: 'Digicel', code: '1246', ranges: ['1246230', '1246231'] },

  { id: 'by_a1', name: 'Belarus - A1 (Velcom)', country: 'Belarus', operator: 'A1 (Velcom)', code: '375', ranges: ['37529', '37544'] },
  { id: 'by_life', name: 'Belarus - life:)', country: 'Belarus', operator: 'life:)', code: '375', ranges: ['37525'] },
  { id: 'by_mts', name: 'Belarus - MTS', country: 'Belarus', operator: 'MTS', code: '375', ranges: ['37529', '37533'] },

  { id: 'be_base', name: 'Belgium - Base', country: 'Belgium', operator: 'Base', code: '32', ranges: ['3248', '32486', '32487'] },
  { id: 'be_mobile', name: 'Belgium - Mobile', country: 'Belgium', operator: 'Mobile', code: '32', ranges: ['3247', '3248', '3249'] },
  { id: 'be_orange', name: 'Belgium - Orange', country: 'Belgium', operator: 'Orange', code: '32', ranges: ['3249', '32495', '32496'] },
  { id: 'be_proximus', name: 'Belgium - Proximus', country: 'Belgium', operator: 'Proximus', code: '32', ranges: ['3247', '32470', '32471'] },

  { id: 'bz_smart', name: 'Belize - Smart', country: 'Belize', operator: 'Smart', code: '501', ranges: ['50166', '50167'] },

  { id: 'cm_mobile', name: 'Cameroon - Mobile', country: 'Cameroon', operator: 'Mobile', code: '237', ranges: ['237626', '23767', '23769'] },
  { id: 'cm_mtn', name: 'Cameroon - MTN', country: 'Cameroon', operator: 'MTN', code: '237', ranges: ['23767', '23768'] },
  { id: 'cm_orange', name: 'Cameroon - Orange', country: 'Cameroon', operator: 'Orange', code: '237', ranges: ['23769', '23765'] },

  { id: 'sl_orange', name: 'Sierra Leone - Orange (Airtel)', country: 'Sierra Leone', operator: 'Orange (Airtel)', code: '232', ranges: ['23275', '23274', '23276', '23278', '23279'] },
  { id: 'sl_africell', name: 'Sierra Leone - Africell', country: 'Sierra Leone', operator: 'Africell', code: '232', ranges: ['23277', '23288', '23230'] },
  { id: 'sl_qcell', name: 'Sierra Leone - Qcell', country: 'Sierra Leone', operator: 'Qcell', code: '232', ranges: ['23231', '23232'] },

  { id: 'ci_mtn', name: 'Ivory Coast - MTN', country: 'Ivory Coast', operator: 'MTN', code: '225', ranges: ['22505', '22506'] },
  { id: 'ci_orange', name: 'Ivory Coast - Orange', country: 'Ivory Coast', operator: 'Orange', code: '225', ranges: ['22507', '22508'] },
  { id: 'ci_moov', name: 'Ivory Coast - Moov', country: 'Ivory Coast', operator: 'Moov', code: '225', ranges: ['22501', '22502'] },

  { id: 'gb_ee', name: 'United Kingdom - EE', country: 'United Kingdom', operator: 'EE', code: '44', ranges: ['44740', '44741', '44742'] },
  { id: 'gb_o2', name: 'United Kingdom - O2', country: 'United Kingdom', operator: 'O2', code: '44', ranges: ['44770', '44771', '44772'] },
  { id: 'gb_vodafone', name: 'United Kingdom - Vodafone', country: 'United Kingdom', operator: 'Vodafone', code: '44', ranges: ['44780', '44781', '44782'] },

  { id: 'us_tmobile', name: 'United States - T-Mobile', country: 'United States', operator: 'T-Mobile', code: '1', ranges: ['15552', '15553', '15554'] },
  { id: 'us_att', name: 'United States - AT&T', country: 'United States', operator: 'AT&T', code: '1', ranges: ['14152', '14153', '14154'] },
  { id: 'us_verizon', name: 'United States - Verizon', country: 'United States', operator: 'Verizon', code: '1', ranges: ['12125', '12126', '12127'] },

  { id: 'in_airtel', name: 'India - Airtel', country: 'India', operator: 'Airtel', code: '91', ranges: ['91987', '91981', '91982'] },
  { id: 'in_jio', name: 'India - Jio', country: 'India', operator: 'Jio', code: '91', ranges: ['91700', '91701', '91702'] },
  { id: 'in_vi', name: 'India - Vodafone Idea', country: 'India', operator: 'Vodafone Idea', code: '91', ranges: ['91989', '91988', '91983'] },
];
