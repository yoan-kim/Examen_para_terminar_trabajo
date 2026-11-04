import { AppLanguage } from './i18n';

export interface VocabWord {
  id: number;
  round: number;
  es: string;
  ko: string;
  altEs: string[];
  altKo: string[];
}

export interface RoundData {
  round: number;
  words: VocabWord[];
}

const RAW_ROUNDS: Record<number, [string, string][]> = {
  1: [["médico/a","의사"],["glorioso/a","영광스러운"],["sacerdote","제사장, 사제"],["injusticia","부당함, 불의"],["consolación","위로, 위안"],["misericordia","자비, 연민"],["persecución","박해, 탄압"],["enfermo/a","아픈 사람, 환자 / 아픈"],["resurrección","부활"],["disciplina","훈육, 징계, 규율"],["profecía","예언"],["ortodoxia","정통, 정통성"],["proceso","과정, 절차"],["cumplimiento","성취, 이행"],["eterno/a","영원한"],["cuerpo","몸, 신체"],["obstaculizar","방해하다, 저지하다"],["testificar","증언하다, 입증하다"],["corazón","마음, 심장"],["transformar","변화시키다, 변형하다"]],
  2: [["juicio","심판"],["estudiante","학생"],["salvación","구원"],["malvado/a","사악한"],["herejía","이단"],["líder","지도자, 리더"],["trampa","함정"],["tormenta","폭풍, 폭풍우"],["evangelizar","복음을 전하다, 전도하다"],["fianza","보석, 보석금"],["traidor/a","배신자"],["falso/a","거짓의, 가짜의"],["expulsado/a","추방된, 쫓겨난"],["alboroto","소란, 대소동"],["multitud","무리, 대중"],["recreación","재창조"],["humilde","겸손한, 비천한"],["enemigo/a","원수, 적"],["trabajo","일, 직업"],["paz","평화, 평안"]],
  3: [["destrucción","파괴, 멸망"],["casa","집"],["venganza","복수, 보복"],["traidor/a","배신자"],["testigo","증인"],["carta","편지"],["castigo","형벌, 처벌"],["tribunal","법원, 재판소"],["oscuridad","어둠, 흑암"],["fiesta","파티, 축제"],["refugio","피난처, 피신처"],["petición","청원, 신청"],["multitud","무리, 대중"],["iglesia","교회"],["condición","조건"],["prueba","증거, 시험"],["orden","명령, 지시"],["pan","빵"],["reino","왕국, 나라"],["apocalipsis","계시, 요한계시록"]],
  4: [["humildad","겸손"],["mansedumbre","온유, 온화함"],["paciencia","인내, 오래 참음"],["vínculo","매는 줄, 결속"],["gracia","은혜, 은총"],["medida","분량, 측정"],["don","선물, 은사"],["apóstol","사도"],["profeta","선지자, 예언자"],["evangelista","복음 전도자"],["pastor/a","목자, 목사"],["maestro/a","교사, 스승"],["edificación","덕을 세움, 건덕"],["estatura","분량, 키"],["plenitud","충만함, 완숙"],["astucia","간사함, 궤술"],["vanidad","허망함, 허영"],["ignorancia","무지, 알지 못함"],["dureza","완악함, 굳어짐"],["lascivia","방탕, 음란"]],
  5: [["renovar","새롭게 하다, 쇄신하다"],["santidad","거룩함, 성결"],["prójimo","이웃, 동포"],["enojo","분노, 성냄"],["amargura","악독, 쓰라림"],["maledicencia","비방, 훼방"],["benigno/a","인자한, 자애로운"],["misericordioso/a","자비로운, 불쌍히 여기는"],["perdonar","용서하다"],["imitador/a","본받는 자, 모방자"],["ofrenda","예물, 헌금"],["sacrificio","희생, 제물"],["olor","향기, 냄새"],["fornicación","음행, 부정한 행위"],["inmundicia","더러움, 불결"],["avaricia","탐욕, 탐심"],["idolatría","우상 숭배"],["herencia","기업, 유업"],["luz","빛"],["tinieblas","어두움, 흑암"]],
  6: [["bondad","선함, 착함"],["reprender","책망하다, 비판하다"],["secreto","은밀함, 비밀"],["sabio/a","지혜로운 사람"],["voluntad","뜻, 의지"],["disolución","방탕함, 무절제"],["salmo","시편, 찬미가"],["himno","찬송가, 찬미"],["cántico","신령한 노래, 찬가"],["alabar","찬양하다, 기리다"],["reverencia","경외, 공경"],["sujetarse","복종하다, 순종하다"],["cabeza","머리, 수장"],["mancha","티, 흠"],["arruga","주름, 결점"],["misterio","비밀, 신비"],["mandamiento","계명, 계율"],["armadura","전신갑주, 갑옷"],["asechanzas","궤계, 간계"],["lucha","싸움, 전쟁"]],
  7: [["sangre","피, 혈통"],["carne","육체, 고기"],["principado","정사, 통치권"],["potestad","권세, 권능"],["gobernadores","주관자들, 통치자들"],["huestes","영들, 군대"],["cinturón","허리띠, 벨트"],["coraza","흉배, 갑옷 가슴받이"],["calzado","신발, 복음의 신"],["escudo","방패"],["yelmo","투구"],["espada","검, 칼"],["oración","기도, 문장"],["suplicar","간구하다, 애원하다"],["embajador/a","사신, 대언자"],["cadenas","쇠사슬, 결박"],["comunión","교제, 친교"],["afecto","애정, 긍휼"],["contienda","다툼, 분쟁"],["vanagloria","허영, 자랑"]],
  8: [["siervo/a","종, 하인"],["obediencia","복종, 순종"],["cruz","십자가"],["exaltar","높이이다, 영광스럽게 하다"],["rodilla","무릎"],["lengua","방언, 혀, 언어"],["confesar","고백하다, 시인하다"],["temblor","떨림"],["murmuración","원망, 불평"],["irreprensible","흠 없는, 나무랄 데 없는"],["luminar","빛, 광명체"],["libación","관제, 제물 전제"],["riquezas","부요함, 보화"],["entendimiento","이해, 총명"],["tesoros","보물, 보화"],["sabiduría","지혜"],["conocimiento","지식, 깨달음"],["tradición","전통, 유전"],["filosofía","철학"],["sutileza","속임수, 교묘함"]],
  9: [["circuncisión","할례"],["incircuncisión","무할례"],["bautismo","세례, 침례"],["sepultado/a","장사된, 매장된"],["decreto","증서, 칙령"],["sombra","그림자"],["pasiones","정욕, 열정"],["deseos","욕심, 소원"],["rencor","원한, 원망"],["blasfemia","신성모독, 훼방"],["renovación","새롭게 함, 쇄신"],["benignidad","자비, 온유"],["perdón","용서, 사유"],["marido","남편"],["mujer","아내, 여성"],["padres","부모"],["hijo/a","자녀, 아들/딸"],["amo/a","상전, 주인"],["azotes","매질, 채찍질"],["cárcel","감옥, 옥"]],
  10: [["milagro","이적, 기적"],["señal","표적, 징조"],["cojo/a","앉은뱅이, 절름발이"],["eunuco","내시, 환관"],["visión","환상, 비전"],["terremoto","지진"],["carcelero","간수"],["magistrados","상관들, 재판관들"],["ciudadano/a","시민"],["traición","반역, 배반"],["edicto","칙령, 포고"],["imperio","제국"],["libre","자유로운"],["libertad","자유"],["anfiteatro","원형경기장"],["toro","황소, 소"],["guirnalda","화환, 꽃다발"],["convicción","확신, 확고한 믿음"],["naufragio","파선, 배의 침몰"],["cepo","착고, 족쇄"]],
  11: [["antorcha","횃불"],["mártir","순교자"],["martirio","순교"],["plomo","납"],["tabernáculo","장막"],["templo","성전"],["vasija","그릇, 대접"],["plaga","재앙, 전염병"],["mar","바다"],["vidrio","유리"],["fuego","불"],["lámpara","등불, 등대"],["trono","보좌, 왕좌"],["vencedor/a","이긴자, 승리자"],["bestia","짐승, 괴수"],["imagen","우상, 형상"],["marca","표, 인"],["número","수, 숫자"],["arpa","거문고, 수금"],["serpiente","뱀, 마귀"]],
  12: [["realidad","실체, 실상"],["semilla","씨, 종자"],["levadura","누룩, 효모"],["cosecha","추수, 수확"],["cosechador/a","추수꾼, 수확자"],["hoz","낫"],["granero","곳간, 창고"],["trigo","밀, 알곡"],["cebada","보리"],["cizaña","가라지, 독보리"],["monte","산"],["primicias","처음 익은 열매"],["libro","책, 서책"],["rollo","두루마리"],["sellado/a","인 맞은, 봉인된"],["sello","인, 도장"],["tribu","지파, 부족"],["vestiduras","옷, 두루마기"],["blanco/a","흰색의, 깨끗한"],["cordero","어린양"]],
  13: [["fuente","샘, 근원"],["llanto","애통, 울음"],["lágrima","눈물"],["muerte","사망, 죽음"],["dolor","아픔, 통증"],["ciudad","성, 도시"],["cónyuge","배우자"],["banquete","잔치, 연회"],["ramera","음녀, 창녀"],["ruina","무너짐, 멸망"],["foso","무저갱, 구덩이"],["azufre","유황"],["trompeta","나팔"],["trueno","뇌성, 우레"],["voz","음성, 목소리"],["relámpago","번개"],["cielo","하늘"],["tierra","땅, 육지"],["sol","해, 태양"],["luna","달"]],
  14: [["estrella","별"],["abismo","무저갱, 깊은 구렁"],["hereje","이단자"],["examen","시험, 검토"],["público/a","공개적인, 대중의"],["portavoz","대언자, 대변인"],["consolador","보혜사, 위로자"],["pacto","언약, 계약"],["ley","법, 율법"],["transgresión","죄, 허물"],["reconciliación","화목, 화해"],["bendición","복, 축복"],["desobediencia","불순종"],["apostasía","배도, 배교"],["apóstata","배도자"],["destrucción","멸망, 파괴"],["destruir","멸망시키다, 파괴하다"],["salvador/a","구원자"],["regla","규칙, 규범"],["hábito","습관"]],
  15: [["pereza","나태, 게으름"],["perezoso/a","게으른, 나태한"],["fuerza","힘, 능력"],["verdad","진리, 참"],["vencer","이기다, 승리하다"],["diezmo","십일조"],["culto","예배"],["adoración","경배, 찬양"],["alabanza","찬양, 송축"],["ayuno","금식"],["pureza","정결, 순결"],["matrimonio","결혼, 혼인"],["voto","서약, 맹세"],["divorcio","이혼"],["fidelidad","신실함, 정조"],["fiel","신실한, 충성된"],["amor","사랑"],["esperanza","소망, 희망"],["fe","믿음, 신앙"],["fruto","열매, 과실"]],
  16: [["perseverancia","견딤, 지속함"],["corona","면류관, 왕관"],["maná","만나"],["piedrecita","돌, 흰 돌"],["vara","지팡이, 철장"],["hierro","철, 쇠"],["columna","기둥"],["recompensa","상, 보상"],["jinete","탄 자, 말 탄 자"],["caballo","말"],["humo","연기"],["doctrina","교리, 가르침"],["materia","재료, 물질"],["discípulo/a","제자"],["misión","사명, 임무"],["obrero/a","일꾼, 사명자"],["soldado","군사, 군인"],["árbol","나무"],["hoja","잎사귀"],["medicina","약, 치료"]],
  17: [["curación","치유, 고침"],["alimento","양식, 음식"],["leche","젖, 도의 초보"],["maduro/a","장성한, 익은"],["fundamento","터, 기초"],["roca","반석"],["construcción","건축, 세움"],["edificio","건물, 성전"],["morada","처소, 거할 곳"],["espíritu","영, 성령"],["ángel","천사, 사자"],["diablo","마귀"],["satanás","사단"],["demonio","귀신, 악령"],["mentiroso/a","거짓말쟁이"],["homicida","살인자"],["engañador/a","미혹하는 자"],["lobo","이리, 늑대"],["oveja","양"],["cabrito","염소"]],
  18: [["rebaño","양 떼"],["oro","금"],["plata","은"],["madera","나무, 목재"],["heno","풀, 풀밭"],["hojarasca","짚, 짚더미"],["horno","풀무불, 용광로"],["lago","못, 호수"],["muro","성곽"],["puerta","성문, 문"],["perla","진주"],["plaza","길, 정원"],["cristal","수정"],["río","강, 시냇물"],["mes","달, 월"],["salud","건강"],["enfermedad","병, 질병"],["población","백성, 주민"],["nación","나라, 민족"],["rey","왕"]],
  19: [["sacerdocio","제사장 직분"],["alegría","환희, 기쁨"],["gratitud","감사"],["agradecimiento","감사함"],["gloria","영광"],["honra","존귀, 명예"],["dominio","주권, 통치"],["riqueza","부, 부유함"],["fortaleza","요새, 힘"],["amén","아멘"],["aleluya","할렐루야"],["creador","창조주"],["padre","아버지"],["epístola","서신, 편지"],["testamento","언약, 약속"],["velo","휘장"],["altar","제단"],["incienso","향, 분향"],["viento","바람"],["frente","이마"]],
  20: [["palmas","종려 가지"],["ancianos","장로들"],["arcángel","천사장"],["diadema","면류관"],["cuidado","돌봄, 양육"],["acusador","참소하던 자"],["creación","창조"],["restauración","회복"],["consumación","완성, 끝"],["sentencia","판결, 판정"],["veredicto","판결"],["promesa","약속"],["cumplir","이행하다, 성취하다"],["guardar","지키다, 수호하다"],["denunciar","고발하다, 폭로하다"],["proclamar","선포하다"],["obrar","일하다, 역사하다"],["guiar","인도하다"],["proteger","보호하다"],["recompensar","보상하다, 상주다"]],
  21: [["confiar","신뢰하다, 의지하다"],["soportar","견디다, 참다"],["luchar","싸우다, 투쟁하다"],["vencer","이기다"],["resplandecer","빛나다"],["iluminar","비추다"],["limpiar","깨끗하게 하다"],["purificar","정결하게 하다"],["santificar","거룩하게 하다"],["revelar","나타내다, 계시하다"],["enseñar","가르치다"],["aprender","배우다"],["anunciar","알리다, 선포하다"],["publicar","공포하다"],["servir","섬기다, 봉사하다"],["adorar","경배하다"],["alabar","찬양하다"],["rogar","간구하다"],["velar","깨어 있다"],["permanecer","머물다, 거하다"]],
  22: [["habitar","거주하다"],["reunir","모으다, 집합하다"],["unir","하나 되다, 결합하다"],["separar","구별하다, 나누다"],["juzgar","심판하다, 재판하다"],["condenar","단죄하다, 처벌하다"],["salvar","구원하다"],["redimir","구속하다, 구속함을 얻다"],["liberar","해방하다, 석방하다"],["librar","구출하다"],["avanzar","전진하다"],["retroceder","후퇴하다"],["asegurar","확신하다"],["ser testigo","증인되다"],["acompañar","동행하다"],["invitar","초청하다"],["dirigir","인도하다"],["sanar","치유하다"],["restaurar","회복하다"],["agradecer","감사하다"]],
  23: [["gozar","기뻐하다"],["alegrarse","즐거워하다"],["lamentar","애통하다"],["entristecerse","슬퍼하다"],["temer","두려워하다"],["avergonzarse","부끄러워하다"],["gloriarse","자랑하다"],["arrepentirse","뉘우치다"],["confesar","고백하다"],["jurar","맹세하다"],["prometer","서약하다"],["recordar","기억하다"],["olvidar","잊다"],["meditar","묵상하다"],["reflexionar","성찰하다"],["discernir","분별하다"],["comprender","깨닫다"],["creer","믿다"],["esperar","소망하다"],["amar","사랑하다"]],
  24: [["ser fiel","충성하다"],["obedecer","순종하다"],["someterse","굴복하다"],["someter","굴복시키다"],["triunfar","승리하다"],["dominar","지배하다"],["gobernar","통치하다"],["reinar","다스리다"],["cumplir","지키다"],["preservar","보존하다"],["ser santo","거룩하다"],["ser justo","의롭다"],["ser verdadero","참되다"],["ser fiel","신실하다"],["ser bueno","선하다"],["ser manso","온유하다"],["ser humilde","겸손하다"],["ser misericordioso","자비롭다"],["ser benigno","인자하다"],["ser valioso","소중하다"]],
  25: [["ser precioso","귀하다"],["santa ciudad","거룩한 성"],["nueva jerusalén","새 예루살렘"],["fuente de agua de vida","생명수 샘"],["fruto del árbol de la vida","생명나무 열매"],["esposa del cordero","어린양의 신부"],["trono de dios","하나님의 보좌"],["orilla del mar de vidrio","유리바다 가"],["plaga de las copas de oro","금 대접 재앙"],["siete trompetas","일곱 나팔"],["siete sellos","일곱 인"],["doce puertas","열두 문"],["doce cimientos","열두 기초석"],["calle de oro puro","정금 길"],["río como el cristal","수정 같은 강"],["nuevo cielo y nueva tierra","새 하늘 새 땅"],["templo del tabernáculo del testimonio","증거장막성전"],["evangelio eterno","영원한 복음"],["cántico nuevo","새 노래"],["primera resurrección","첫째 부활"]],
  26: [["vida eterna y gozo","영생 복락"],["pueblo del cielo","천국 백성"],["semilla de dios","하나님의 씨"],["cosechador","추수꾼"],["sellado","인 맞은 자"],["líderes de las doce tribus","12지파장"],["persona con una misión","사명자"],["líder de celula","구역장"],["maestro","교사"],["evangelizador","전도자"],["administrador","청지기"],["soldado","군사"],["obrero","일꾼"],["centinela","파수꾼"],["testigo","증인"],["portavoz","대언자"],["vencedor","이긴자"],["pastor prometido","약속의 목자"],["verdadero creyente","참 신앙인"],["santo, creyente","성도"]],
  27: [["culto, adoración","예배"],["oración","기도"],["alabanza","찬양"],["acción de gracias","감사"],["ofrenda","헌금"],["diezmo","십일조"],["servicio","봉사"],["evangelización","전도"],["educación","교육"],["entrenamiento","훈련"],["cuidado, crianza","양육"],["comunión","교제"],["unidad","연합"],["paz","화평"],["amor","사랑"],["sacrificio","희생"],["fidelidad","충성"],["obediencia","순종"],["paciencia","인내"],["arrepentimiento","회개"]],
  28: [["redención","구속"],["perdón de pecados","죄 사함"],["justificación","칭의"],["santificación","성화"],["glorificación","영화"],["salvación","구원"],["vida eterna","영생"],["resurrección","부활"],["esperanza","소망"],["fe","믿음"],["gracia","은혜"],["verdad","진리"],["revelación","계시"],["realidad cumplida","실상"],["profecía","예언"],["cumplimiento","성취"],["promesa","약속"],["pacto","언약"],["evangelio","복음"],["palabra","말씀"]],
  29: [["hijos de luz","빛의 자녀"],["fruto de la luz","빛의 열매"],["armadura completa","전신갑주"],["espada del espíritu","성령의 검"],["escudo de la fe","믿음의 방패"],["yelmo de la salvación","구원의 투구"],["coraza de justicia","의의 흉배"],["cinturón de la verdad","진리의 띠"],["calzado de la paz","평안의 신"],["templo de dios","하나님의 성전"],["templo del espíritu santo","성령의 전"],["cuerpo de cristo","그리스도의 몸"],["familia de dios","하나님의 가족"],["ciudadanos del cielo","천국 시민"],["corona de justicia","의의 면류관"],["corona de la vida","생명의 면류관"],["corona de gloria","영광의 면류관"],["obra de dios","하나님의 일"],["propósito de dios","하나님의 목적"],["gozo de dios","하나님의 기쁨"]],
  30: [["reino eterno","영원한 왕국"],["alimento de vida eterna","영생의 양식"],["río de agua de vida","생명수 강"],["maná escondido","감추었던 만나"],["piedrecita blanca","흰 돌"],["vara de hierro","철장 권세"],["nuevo nombre","새 이름"],["nombre de dios","하나님의 이름"],["nombre de la nueva jerusalén","새 예루살렘의 이름"],["sentarse en el trono","보좌에 앉음"],["esperanza de vida eterna","영생의 소망"],["fe inquebrantable","불변의 믿음"],["lema de victoria","승리의 구호"],["ejército celestial","천군 천사"],["reino del mundo espiritual","영계 천국"],["reino en la tierra","육계 천국"],["unión de espíritu y cuerpo","신인합일"],["anuncio","공지, 광고"],["reunión","모임, 회의"],["asamblea","총회, 모임"]]
};

export const VOCAB_DATABASE: Record<number, RoundData> = {};
export const ALL_WORDS_MAP: Record<number, VocabWord> = {};
export const ALL_WORDS_LIST: VocabWord[] = [];

for (let r = 1; r <= 30; r++) {
  const rawList = RAW_ROUNDS[r] || [];

  const words: VocabWord[] = rawList.map((item, idx) => {
    const es = item[0].trim();
    const ko = item[1].trim();

    let altEs = [es];
    if (es.includes('/a')) {
      const base = es.replace('/a', '').trim();
      const fem = base.endsWith('o') ? base.slice(0, -1) + 'a' : base + 'a';
      altEs = Array.from(new Set([base, fem, es]));
    } else if (es.includes('/o')) {
      const base = es.replace('/o', '').trim();
      const masc = base.endsWith('a') ? base.slice(0, -1) + 'o' : base + 'o';
      altEs = Array.from(new Set([base, masc, es]));
    } else if (es.includes(',')) {
      const parts = es.split(',').map((s) => s.trim());
      altEs = Array.from(new Set([es, ...parts]));
    }

    const rawKoTokens = ko
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const altKo = Array.from(new Set([ko, ...rawKoTokens]));

    const wordObj: VocabWord = {
      id: r * 1000 + (idx + 1),
      round: r,
      es,
      ko,
      altEs,
      altKo,
    };

    ALL_WORDS_MAP[wordObj.id] = wordObj;
    ALL_WORDS_LIST.push(wordObj);
    return wordObj;
  });

  VOCAB_DATABASE[r] = {
    round: r,
    words,
  };
}

/**
 * Returns the Spanish word with tildes (term) and the Korean meaning (meaning).
 */
export function getWordDisplay(
  word: VocabWord,
  _lang?: AppLanguage
): {
  term: string;
  meaning: string;
} {
  return {
    term: word.es,
    meaning: word.ko,
  };
}

/**
 * Validates whether user input for the Spanish word (한➔스) is correct.
 * Detects missing Spanish tilde (accents).
 */
export function checkTermAnswer(
  userVal: string,
  word: VocabWord,
  _lang?: AppLanguage
): { isCorrect: boolean; missingTilde: boolean } {
  const cleanUser = userVal.trim().toLowerCase();
  if (!cleanUser) return { isCorrect: false, missingTilde: false };

  const stripAccents = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const validEs = word.altEs.map((s) => s.toLowerCase());
  const isCorrect = validEs.includes(cleanUser);
  const missingTilde =
    !isCorrect &&
    validEs.some((ans) => stripAccents(ans) === stripAccents(cleanUser));

  return { isCorrect, missingTilde };
}

/**
 * Validates whether user input for the Korean meaning (스➔한) is correct.
 */
export function checkMeaningAnswer(
  userVal: string,
  word: VocabWord,
  _lang?: AppLanguage
): { isCorrect: boolean; missingTilde: boolean } {
  const cleanUser = userVal.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleanUser) return { isCorrect: false, missingTilde: false };

  const validTokens = word.altKo.map((s) =>
    s.toLowerCase().replace(/\s+/g, '')
  );

  return {
    isCorrect: validTokens.includes(cleanUser),
    missingTilde: false,
  };
}
