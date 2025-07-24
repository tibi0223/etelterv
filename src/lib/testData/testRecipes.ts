export type TestRecipe = {
  'Recept ID': number;
  Receptnév: string;
  Elkészítése: string;
  Kép: string;
  Szenhidrat_g: number;
  Feherje_g: number;
  Zsir_g: number;
  'Recept_Skálázhatóság': string;
};

export const testRecipes: TestRecipe[] = [
  {
    'Recept ID': 1,
    Receptnév: 'Almás Muffin Répával',
    Elkészítése: '1. Előkészítés: Melegítsd elő a sütőt 180°C-ra (alsó-felső sütés). Bélelj ki papírkapszlival 3-4 mélyedést egy muffin sütőformában, vagy vajazd/olajozd ki őket. Az almát és a sárgarépát mosd meg, hámozd meg, majd reszeld le kis lyukú reszelőn. A diót vágd durvára.\n2. Száraz hozzávalók összekeverése: Egy közepes tálban alaposan keverd össze a Szafi Reform rostkeveréket (vagy használt lisztkeveréket), az édesítőszert, a sütőport, a csipet sót és az őrölt fahéjat.\n3. Nedves hozzávalók és reszelékek előkészítése: Egy másik tálban enyhén verd fel a tojást. Add hozzá az olvasztott (de nem forró) kókuszzsírt, a vanília aromát, a lereszelt almát és sárgarépát. Keverd össze.\n4. Összeállítás: Öntsd a nedves, répás-almás keveréket a száraz hozzávalókhoz. Adj hozzá a durvára vágott diót. Óvatosan, de alaposan keverd össze, csak amíg a hozzávalók egyneművé válnak. A gluténmentes, rostban gazdag tésztáknál fontos, hogy ne keverd túl, de minden alaposan elegyedjen. Hagyd állni a masszát 5-10 percig, hogy a rostok megszívhassák magukat nedvességgel, ha a lisztkeverék használati utasítása javasolja.\n5. Sütés: Kanalazd a masszát az előkészített muffinforma mélyedéseibe, kb. kétharmadig töltve őket. Süsd az előmelegített sütőben körülbelül 20-25 percig. A sütési idő függ a muffinok méretétől és a sütődtől. Végezz tűpróbát: szúrj egy fogpiszkálót az egyik muffin közepébe; ha tisztán, morzsok nélkül jön ki, elkészültek.\n6. Hűtés: A megsült muffinokat hagyd a formában pár percig hűlni, majd óvatosan vedd ki őket, és tedd rácsra, hogy teljesen kihűljenek.',
    Kép: 'https://drive.google.com/thumbnail?id=1GbHAYbAFZ4SyVWPAC14ZUhdf3RAjd5oo',
    Szenhidrat_g: 14,
    Feherje_g: 13,
    Zsir_g: 34,
    'Recept_Skálázhatóság': 'Nem skálázható'
  },
  {
    'Recept ID': 2,
    Receptnév: 'Ananászos/Barackos Csirke',
    Elkészítése: '1. Rizs elkészítése:\no A basmati rizst alaposan öblítsd át hideg vízzel többször is, amíg a víz tisztább nem lesz.\no Tedd a rizst egy kisebb lábosba, add hozzá a vizet (vagy alaplevet) és egy csipet sót.\no Forrald fel, majd vedd a lángot a legalacsonyabbra, fedd le, és párold kb. 10-12 percig, vagy amíg az összes vizet felszívja és megpuhul.\no A főzési idő végén húzd le a tűzről, és lefedve hagyd állni még 5-10 percig.\n2. Csirke előkészítése és sütése (amíg a rizs párolódik/pihen):\no Melegítsd elő a sütőt 180°C-ra (alsó-felső sütés).\no A csirkemellfilét mosd meg, töröld szárazra. Ha szükséges, vágd kisebb szeletre vagy enyhén klopfold ki, hogy egyenletesebben süljön.\no Sózd és borsozd meg a csirkemellfilé mindkét oldalát.\no Egy kis méretű hőálló tálat vagy tepsit kenj ki vékonyan az olajjal (vagy használj sütőpapírt).\no Helyezd a fűszerezett csirkemellet a sütőtálba.\no A lecsepegtetett ananászkarikákat/-darabokat (vagy barackszeleteket) oszd el a csirkemell tetején.\n3. Sütés: Süsd az előmelegített sütőben kb. 20-25 percig. A sütési idő függ a csirkemell vastagságától. Akkor jó, ha a hús teljesen átsült (ha megszúrod, tiszta, nem rózsaszínes lé folyik ki belőle), és a gyümölcs a tetején enyhén megpirult.\n4. Tálalás: Vedd ki a csirkét a sütőből. Tálald a frissen párolt basmati rizzsel. A sütőtálban összegyűlt szaftot is locsold a csirkére és a rizsre.',
    Kép: 'https://drive.google.com/thumbnail?id=13OFAiu15c8ChNrGdrGJzQYb0mxtnrPCy',
    Szenhidrat_g: 45,
    Feherje_g: 39,
    Zsir_g: 5,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 3,
    Receptnév: 'Avokádó "Csónak" Füstölt Lazaccal és Főtt Tojással',
    Elkészítése: '1. Tojás előkészítése (ha szükséges): Ha a tojások nincsenek előre megfőzve, főzd őket keményre (forrástól számítva kb. 8-10 perc). Hűtsd le hideg víz alatt, pucold meg, majd kockázd fel apróra. \n2. Avokádó előkészítése: Az érett avokádót vágd hosszában félbe, és távolítsd el a magját. Egy kanállal óvatosan vájj ki mindkét félből egy kevés avokádóhúst, hogy nagyobb mélyedést ("csónakot") kapj, de ügyelj rá, hogy maradjon egy kb. 0.5-1 cm vastag perem. Az kivájt avokádóhúst tedd egy kis tálba. \n3. Töltelék összeállítása: A kivájt és felkockázott avokádóhúshoz add hozzá a felkockázott főtt tojást, az aprított füstölt lazacot és az 1-2 teáskanál frissen facsart citromlevet (ez megakadályozza az avokádó barnulását és friss ízt ad). Ízesítsd sóval és frissen őrölt fekete borssal. Óvatosan keverd össze, hogy az alapanyagok ne törjenek nagyon össze. \n4. "Csónakok" megtöltése: Az elkészített lazacos-tojásos-avokádós keveréket kanalazd vissza egyenletesen a két avokádófél mélyedésébe. \n5. Díszítés és tálalás: Szórd meg a tetejét a frissen aprított kaporral, snidlinggel vagy az "Everything Bagel" fűszerkeverékkel. Azonnal tálald. ',
    Kép: 'https://drive.google.com/thumbnail?id=16_su1kBdWPy9Ty0YaF_IhRYudVae7JI5',
    Szenhidrat_g: 12,
    Feherje_g: 25,
    Zsir_g: 31,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 4,
    Receptnév: 'Avokádó Saláta kovászos kenyérrel',
    Elkészítése: '1. Tojás főzése: A tojásokat tedd hideg vízbe, majd a forrástól számítva főzd keményre kb. 8-10 percig. Amint elkészültek, hűtsd le őket hideg víz alatt, pucold meg, majd kockázd fel vagy vágd cikkekre.\n2. Zöldségek előkészítése: Amíg a tojás fő és hűl, készítsd elő a zöldségeket. A paradicsomot, paprikát és uborkát mosd meg, majd vágd kisebb, falatnyi kockákra. A vöröshagymát pucold meg és aprítsd nagyon finomra, vagy vágd vékony csíkokra.\n3. Avokádó előkészítése: Az avokádót vágd félbe, távolítsd el a magját. Kanalazd ki a húsát egy közepes méretű salátás tálba. Egy villa segítségével törd össze durvára, vagy vágd szintén kockákra, ahogy jobban szereted. Azonnal locsold meg a citromlével, hogy megőrizze szép zöld színét és ne barnuljon meg.\n4. Saláta összeállítása: Az előkészített avokádóhoz add hozzá a felkockázott paradicsomot, paprikát, uborkát és a finomra aprított vöröshagymát. Óvatosan forgasd össze.\n5. Add hozzá a főtt, feldarabolt tojást is a salátához.\n6. Ízesítés: Szórd meg sóval, frissen őrölt fekete borssal és bőségesen aprított friss petrezselyemzölddel. Még egyszer óvatosan keverd át, hogy az ízek eloszoljanak.\n7. Tálalás: A kovászos kenyeret ízlés szerint megpiríthatod. Tálald az avokádósalátát a szelet (vagy pirított) kovászos kenyérrel. A kenyeret fogyaszthatod a saláta mellé, vagy akár apró kockákra vágva, krutonként a salátába is keverheted közvetlenül tálalás előtt.',
    Kép: 'https://drive.google.com/thumbnail?id=149QMPCPplpV0ojszGFBLzVgfEe6r0B6z',
    Szenhidrat_g: 29,
    Feherje_g: 18,
    Zsir_g: 21,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 5,
    Receptnév: 'Avokádó-Tojás Saláta kovászos kenyérrel',
    Elkészítése: '1. Tojások főzése: A tojásokat tedd fel főni hideg vízben. Forrástól számítva főzd keményre kb. 8-10 percig. Ha kész, hideg vízzel hűtsd le gyorsan, majd pucold meg.\n2. Alapanyagok előkészítése (amíg a tojás fő/hűl): \no Az avokádót vágd félbe, távolítsd el a magját, kanalazd ki a húsát egy tálba, és egy villa segítségével törd össze kissé (lehet darabosabb vagy krémesebb, ízlés szerint). Ha használsz, csepegtess rá pár csepp citromlevet, hogy ne barnuljon meg.\no A lilahagymát (vagy újhagymát) aprítsd finomra.\n3. Saláta összeállítása: \no A megfőtt, megpucolt tojásokat vágd apró kockákra, vagy törd össze villával, és add az avokádóhoz.\no Add hozzá az aprított lilahagymát és a mustárt.\no Óvatosan keverd össze az alapanyagokat. Ízesítsd sóval, frissen őrölt feketeborssal.\n4. Tálalás: Az avokádós-tojásos salátát halmozd a szelet kovászos kenyérre, vagy kínáld mellette. Friss zöldfűszerrel (pl. petrezselyem, snidling) megszórva még finomabb. Azonnal fogyasztandó.',
    Kép: 'https://drive.google.com/thumbnail?id=1dyGbI3xwtJFSQ7BBZvgNxjEQ2y0vjbN-',
    Szenhidrat_g: 22,
    Feherje_g: 18,
    Zsir_g: 19,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 6,
    Receptnév: 'Avokádós Csirkés Tortilla',
    Elkészítése: '1. Csirkemell sütése: A csirkemellfilét mosd meg, töröld szárazra, majd vágd vékonyabb csíkokra vagy kockákra. Fűszerezd ízlés szerint sóval, borssal, és egyéb kedvelt fűszerekkel. Egy serpenyőt hevíts fel (a recept szerint zsiradék nélkül, így teflon vagy jól bevonatos serpenyő ajánlott), majd süsd meg benne a csirkemell darabokat közepes lángon, időnként megforgatva, amíg minden oldala átsül és enyhén megpirul (kb. 5-7 perc). Tedd félre.\n2. Zöldségek és avokádó előkészítése: Amíg a csirke sül, készítsd elő a többi hozzávalót. Az avokádót vágd félbe, kanalazd ki a húsát egy kis tálkába, és villával pépesítsd. Ízlés szerint adj hozzá pár csepp citromlevet, sót, borsot. A paradicsomot és az uborkát mosd meg, majd szeleteld fel vékony karikákra vagy csíkokra.\n3. Tortilla összeállítása: A tortilla lapot enyhén melegítsd meg egy száraz serpenyőben mindkét oldalán pár másodpercig, vagy mikrohullámú sütőben (csak hogy hajlíthatóbb legyen). Terítsd ki a meleg tortilla lapot. Kend meg az avokádópéppel a közepét, egy sávban. Helyezd rá a sült csirkemell darabokat. Rakd rá a paradicsom- és uborkaszeleteket. Végül nyomj rá ízlés szerint cukormentes ketchupot.\n4. Feltekerés és tálalás: Hajtsd be a tortilla két szemközti szélét kissé, majd alulról szorosan tekerd fel. Ízlés szerint félbe vághatod átlósan. Azonnal fogyasztható.',
    Kép: 'https://drive.google.com/thumbnail?id=1PnCEy3mQz2qPSBIbvLaCLWKO6qNB0gRZ',
    Szenhidrat_g: 40,
    Feherje_g: 30,
    Zsir_g: 15,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 7,
    Receptnév: 'Avokádós Tojásreggeli',
    Elkészítése: '1. Főzd meg a tojásokat keményre (kb. 8-10 perc forrástól számítva). \n2. Amíg a tojások főnek, pürésítsd az avokádót egy tálkában (villával vagy botmixerrel), majd keverj hozzá sót és borsot ízlés szerint. \n3. Pirítsd meg a kovászos kenyér szeletet (kenyérpirítóban vagy száraz serpenyőben). \n4. Kend a megpirított kenyérre az ízesített avokádókrémet. \n5. A megfőtt, megpucolt tojásokat szeleteld rá az avokádós kenyérre. \n6. Ízlés szerint tovább sózhatod, borsozhatod. Azonnal tálald. ',
    Kép: 'https://drive.google.com/thumbnail?id=1z7E0XKSrTEkriDxJ1nbqnqScxnRRPAF4',
    Szenhidrat_g: 20,
    Feherje_g: 17,
    Zsir_g: 19,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 8,
    Receptnév: 'Avokádós tonhalsaláta',
    Elkészítése: '1. Alapanyagok előkészítése: A tonhalkonzervről alaposan csepegtesd le a vizet. Az avokádót vágd félbe, távolítsd el a magját, és a húsát kanalazd egy közepes méretű tálba. A spenótleveleket szükség esetén mosd meg és szárítsd meg.\n2. Avokádókrém készítése: Az avokádót villával törd össze a tálban, amíg krémes állagú nem lesz (maradhatnak benne kisebb darabok is, ízlés szerint). Azonnal add hozzá a citromlevet, hogy megakadályozd a barnulást.\n3. Tonhalsaláta összeállítása: Add a lecsöpögtetett tonhalat az avokádókrémhez. Locsold meg az olívaolajjal, sózd, borsozd ízlés szerint. Óvatosan keverd össze az összetevőket, hogy a tonhal ne törjön össze túlságosan.\n4. Tálalás: A friss spenótleveleket helyezd egy tányérra vagy keverd közvetlenül a salátához. Halmozd rá az avokádós tonhalsalátát. Kínáld mellé a szelet kovászos kenyeret (ízlés szerint meg is piríthatod). A salátát a kenyérre is halmozhatod.',
    Kép: 'https://drive.google.com/thumbnail?id=1hcn6CJd-JwPiATF5Ie5XMnHYM1wBYz9N',
    Szenhidrat_g: 22,
    Feherje_g: 29,
    Zsir_g: 16,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 9,
    Receptnév: 'Avokádós-Kovászos Crostini Főtt Tojással',
    Elkészítése: 'Pirítsuk meg a kenyeret (kenyérpirítóban vagy száraz serpenyőben), majd vágjuk kis kockákra (crostini méretűre). Az avokádót egy kis tálkában villával pépesítjük, majd ízesítjük a citromlével, sóval és borssal. A keményre főtt tojásokat felkockázzuk. Az elkészült avokádókrémet rákenjük vagy rátesszük a pirított kenyérkockákra, majd a tetejére szórjuk a felkockázott főtt tojást. Ízlés szerint megszórhatjuk egy kevés chilipaprika pehellyel.',
    Kép: 'https://drive.google.com/thumbnail?id=1MCNv-iTBuACb0E_HAu2rb8uDnz7Z5Pwz',
    Szenhidrat_g: 12,
    Feherje_g: 15,
    Zsir_g: 14,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 10,
    Receptnév: 'Avokádós-Pulykamell Sonkás Szendvics',
    Elkészítése: '1. A szelet teljes kiőrlésű kovászos kenyeret pirítsd meg kenyérpirítóban vagy száraz serpenyőben ízlés szerint.\n2. Az érett avokádót (1/4 darabot) vagy vágd vékony szeletekre, vagy egy kis tálkában villával törd össze kissé, és ízesítsd a citromlével, sóval, borssal.\n3. Ha az avokádót pépesítetted, kend meg vele a pirított kenyeret. Ha szeleteket használsz, egyszerűen helyezd a szeleteket a pirítósra.\n4. Pakold rá a bébispenót leveleket, majd helyezd el a pulykamell sonka szeleteket.\n5. Ízlés szerint sózd, borsozd meg a szendvics tetejét, és ha nem használtad az avokádóhoz, locsold meg itt egy kevés citromlével.\n6. Azonnal fogyaszd.',
    Kép: 'https://drive.google.com/thumbnail?id=1fCcIIx9MwnMiyDpKq-jz6ZukNtLFCSU7',
    Szenhidrat_g: 22,
    Feherje_g: 16,
    Zsir_g: 7,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 11,
    Receptnév: 'Avokádós-Pulykamell Sonkás Szendvics Citrommal',
    Elkészítése: '1. A szelet teljes kiőrlésű kovászos kenyeret pirítsd meg kenyérpirítóban vagy száraz serpenyőben ízlés szerint ropogósra.\n2. Az érett avokádó negyedének húsát vagy vágd vékony szeletekre, vagy egy kis tálkában villával törd össze enyhén. Azonnal csepegtesd meg a citromlével, hogy ne barnuljon meg, majd ízlés szerint sózd és borsozd.\n3. A pirított kenyérszeletre helyezd rá a bébispenót leveleket.\n4. Rétegezd rá a pulykamell sonka szeleteket.\n5. Végül add hozzá az előkészített avokádót (szeletelve vagy krémként elkenve).\n6. Ha szükséges, ízesítsd még egy kevés sóval, borssal a tetejét.\n7. Azonnal fogyaszd.',
    Kép: 'https://drive.google.com/thumbnail?id=1Q0hElYfaYx-Za858OzrcJNxiKyH4i_T6',
    Szenhidrat_g: 22,
    Feherje_g: 16,
    Zsir_g: 7,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 12,
    Receptnév: 'Áfonyás Muffin',
    Elkészítése: '1. Előkészítés: Melegítsd elő a sütőt 170°C-ra (alsó-felső sütés). Készíts elő 1-2 mélyedést egy muffin sütőformában (kibélelve papírkapszlival vagy kivajazva/olajozva).\n2. Száraz hozzávalók összekeverése: Egy közepes tálban keverd össze alaposan a zablisztet, a kakaóport, a sütőport és az ízlés szerinti édesítőszert.\n3. Nedves hozzávalók összekeverése: Egy másik kisebb tálban villával enyhén verd fel a tojást. Add hozzá a növényi tejet és az olvasztott (de nem forró) kókuszzsírt, majd keverd simára.\n4. Összeállítás: Öntsd a nedves keveréket a száraz hozzávalókhoz. A megadott instrukció szerint "alaposan összekeverjük", de a muffinoknál általában javasolt csak addig keverni, amíg az összetevők éppen összeállnak, hogy a végeredmény puha maradjon.\n5. Extrák hozzáadása: Forgasd bele óvatosan az áfonyát és az apróra vágott mandulát.\n6. Sütés: Oszd el a masszát az előkészített muffinforma mélyedései(be)n. Süsd az előmelegített sütőben körülbelül 20 percig. Végezz tűpróbát: szúrj egy fogpiszkálót a muffin közepébe; ha tisztán jön ki, elkészült. (Figyelem: a kis mennyiség és a szokatlan arányok miatt a sütési idő és az állag eltérhet a megszokottól.)\n7. Hűtés: A megsült muffinokat hagyd a formában pár percig hűlni, majd óvatosan vedd ki őket, és tedd rácsra, hogy teljesen kihűljenek.',
    Kép: 'https://drive.google.com/thumbnail?id=1jhPvIP5Dpea-41WG3Y48wYYq8s7MKNWz',
    Szenhidrat_g: 21,
    Feherje_g: 12,
    Zsir_g: 21,
    'Recept_Skálázhatóság': 'Nem skálázható'
  },
  {
    'Recept ID': 13,
    Receptnév: 'Almaleves',
    Elkészítése: '1. Alma előkészítése és főzése: Az almát mosd meg, hámozd meg (ízlés szerint, de levesbe általában hámozva kerül), magházát távolítsd el, majd kockázd fel kisebb darabokra. Tedd egy lábosba a felkockázott almát. Adj hozzá annyi vizet, amennyi ellepi (kb. 200-300 ml, a kívánt sűrűségtől függően), a fahéjat, a szegfűszeget, a csipet sót és az ízlés szerinti édesítőszert. Kezdd el főzni közepes lángon. Főzd addig, amíg az alma megpuhul (kb. 10-15 perc).\n2. Sűrítés: Amíg az alma fő, egy kis tálkában keverd simára a vaníliás pudingport a növényi tejjel. Ügyelj rá, hogy ne maradjanak benne csomók. Amikor az alma megpuhult, vedd ki a levesből az egész fűszereket (fahéjrudat, szegfűszegeket), ha nem szeretnéd, hogy benne maradjanak. A pudingporos tejet lassan, folyamatos kevergetés mellett csorgasd a forrásban lévő almaleveshez.\n3. Befejezés: Forrald fel újra a levest, majd főzd még körülbelül 2 percig, amíg kissé besűrűsödik. Ha használod, ennél a pontnál add hozzá a néhány csepp citromlevet az ízesítéshez. Kóstold meg, és ha szükséges, édesítsd utána.\n4. Tálalás: Melegen vagy hidegen is tálalható.',
    Kép: 'https://drive.google.com/thumbnail?id=1nIc5_hNZ1LXqSZA-RjtjSaVRzC_EU2jF',
    Szenhidrat_g: 23,
    Feherje_g: 2,
    Zsir_g: 3,
    'Recept_Skálázhatóság': 'Nem skálázható'
  },
  {
    'Recept ID': 14,
    Receptnév: 'Almás-Fahéjas Crumble',
    Elkészítése: '1. Előkészítés: Melegítsd elő a sütőt 180°C-ra (alsó-felső sütés). Készíts elő egy kis méretű, hőálló tálat vagy sütőformát (kb. 10x15 cm, vagy egy nagyobb bögrét). Az elkészítési mód alapján ez nem klasszikus "süti" lesz, hanem inkább egy egyadagos sült alma crumble/morzsasütemény. A sütőpapírral bélelés opcionális, de segíthet a tisztításban. \n2. Alma előkészítése: Az almát hámozd meg, magházát távolítsd el, majd szeleteld fel vékonyabb cikkekre vagy kockázd fel. Locsold meg azonnal a citromlével, hogy ne barnuljon meg. Helyezd az almaszeleteket/kockákat az előkészített sütőforma aljára egyenletesen elosztva. \n3. Zabpelyhes keverék elkészítése: Egy kis tálban keverd össze a zabpelyhet, a darált diót, az őrölt fahéjat és az ízlés szerinti édesítőszert. Add hozzá az olvasztott (de nem forró) kókuszzsírt, és keverd össze alaposan, hogy a zabpelyhes keverék kissé összeálljon, morzsás legyen. \n4. Összeállítás és sütés: Szórd egyenletesen a zabpelyhes keveréket az almakészítmény tetejére. Süsd az előmelegített sütőben 30-35 percig, amíg a teteje szép aranybarnára sül, és az alma alatta megpuhul, fortyog. \n5. Tálalás: Melegen tálald, önmagában vagy egy kanál növényi joghurttal, esetleg vaníliafagylalttal. ',
    Kép: 'https://drive.google.com/thumbnail?id=1DYQWjQmsFSCCm3u2aB2rccCIlbfBgF1S',
    Szenhidrat_g: 35,
    Feherje_g: 8,
    Zsir_g: 17,
    'Recept_Skálázhatóság': 'Skálázható'
  },
  {
    'Recept ID': 15,
    Receptnév: 'Ázsiai lazacos quinoa',
    Elkészítése: '1. Quinoa főzése: A 40 g quinoát alaposan öblítsd át hideg vízzel egy finom szűrőben. Tedd fel főni kétszeres mennyiségű vízben (kb. 80-100 ml). Forrás után vedd alacsonyra a lángot, fedd le, és főzd kb. 12-15 percig, amíg a víz teljesen felszívódik és a quinoa megpuhul. Húzd le a tűzről, és hagyd fedő alatt pihenni még 5 percig, majd villával lazítsd fel.\n2. Hozzávalók előkészítése: Amíg a quinoa fő, készítsd elő a többi alapanyagot. A lazacfilét szükség esetén vágd adagokra. A zöldségeket tisztítsd meg és vágd fel a kívánt méretre (pl. brokkolirózsák, paprika csíkok, répa szeletek). Reszeld le vagy aprítsd finomra a gyömbért.\n3. Lazac pácolása és sütése (opcionális pác): A lazacot ízesítheted a reszelt gyömbér egy részével, egy kevés szezámolajjal és opcionálisan egy kevés szójaszósszal. Hagyd állni pár percig. Süsd a lazacot serpenyőben (oldalanként 3-5 percig, kevés olajon, ha szükséges) vagy sütőben (kb. 180-200°C-on 12-15 perc alatt), amíg átsül és omlós lesz.\n4. Zöldségek párolása/pirítása: Egy serpenyőben vagy wokban hevíts fel egy kevés olajat (ha szükséges, a szezámolaj egy részét is használhatod itt, de a szezámolaj intenzív íze miatt gyakran csak a végén adják hozzá). Dobd rá a keményebb zöldségeket először (pl. sárgarépa, brokkoli), pirítsd pár percig, majd add hozzá a puhábbakat (pl. paprika). Párold vagy pirítsd roppanósra (kb. 5-7 perc). Közben add hozzá a maradék reszelt gyömbért, és ízesítsd opcionálisan szójaszósszal.\n5. Tálalás: A megfőtt quinoát szedd egy tálba. Helyezd rá a sült lazacot és a párolt/pirított zöldségeket. Csorgasd meg az 1 teáskanál szezámolajjal (ha nem használtad el teljesen a sütéshez/pirításhoz). Ízlés szerint tovább ízesítheted szójaszósszal vagy egy kevés friss zöldfűszerrel (pl. koriander, újhagyma).',
    Kép: 'https://drive.google.com/thumbnail?id=1t-n_q0wEHld1AWaLyB-1f0liIz9pxGF8',
    Szenhidrat_g: 38,
    Feherje_g: 58,
    Zsir_g: 21,
    'Recept_Skálázhatóság': 'Skálázható'
  }
]; 