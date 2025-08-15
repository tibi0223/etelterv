<<<<<<< HEAD
# Ételtervező és Makró Skálázó

## 📋 Leírás

Ez egy modern webes alkalmazás, amely segít a felhasználóknak étrendet tervezni és a makró tápanyagokat (fehérje, szénhidrát, zsír) pontosan skálázni a célértékekhez.

## ✨ Főbb funkciók

- **Étrend tervezés**: Automatikus recept kombinációk generálása
- **Makró skálázás**: Pontos skálázás a megadott makró célokhoz
- **Többnapos tervezés**: Több napra szóló étrendek generálása
- **Intelligens algoritmus**: Fejlett skálázási algoritmus 5% pontossággal
- **Felhasználói preferenciák**: Kedvencek és preferenciák kezelése

## 🚀 Telepítés

1. **Repository klónozása**:
```bash
git clone https://github.com/your-username/eteltervezo-makro-skalazo.git
cd eteltervezo-makro-skalazo
```

2. **Függőségek telepítése**:
```bash
npm install
```

3. **Fejlesztői szerver indítása**:
```bash
npm run dev
```

4. **Alkalmazás megnyitása**:
Nyisd meg a böngészőben: `http://localhost:8081`

## 🛠️ Technológiák

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Shadcn/ui + Tailwind CSS
- **Build Tool**: Vite
- **Adatbázis**: Supabase
- **Styling**: CSS Modules + Tailwind

## 📁 Projekt struktúra

```
src/
├── components/
│   ├── food-planner/
│   │   ├── MacroScalerApp.tsx      # Fő makró skálázó komponens
│   │   ├── MultiDayMacroScaler.tsx # Többnapos tervező
│   │   └── ...
│   └── ui/                         # UI komponensek
├── services/
│   ├── macroScaler.ts              # Makró skálázási algoritmus
│   ├── mealPlanGenerator.ts        # Étrend generálás
│   └── ...
└── types/                          # TypeScript típusok
```

## 🎯 Használat

1. **Makró célok beállítása**: Állítsd be a napi fehérje, szénhidrát, zsír és kalória célokat
2. **Étkezési típusok kiválasztása**: Válaszd ki a kívánt étkezési típusokat (reggeli, ebéd, vacsora)
3. **Étrend generálása**: Kattints a "Étrend Tervezése és Skálázása" gombra
4. **Eredmények megtekintése**: A rendszer automatikusan skálázza a recepteket a célmakrókhoz

## 🔧 Fejlesztés

### Új funkció hozzáadása

1. Hozz létre egy új komponenst a `src/components/` mappában
2. Implementáld a logikát a `src/services/` mappában
3. Adj hozzá típusokat a `src/types/` mappában
4. Teszteld a funkciót

### Build production verzióhoz

```bash
npm run build
```

## 📊 Algoritmus részletek

### Makró Skálázás

A rendszer két lépcsős skálázási algoritmust használ:

1. **Arányos skálázás**: Egyszerű szorzó alkalmazása minden alapanyagra
2. **Alapanyag-szintű skálázás**: Egyedi alapanyagok mennyiségének finomhangolása

### Pontosság

- **5% tolerancia**: Minden makró (fehérje, szénhidrát, zsír) 5%-on belül kell lennie
- **200 próbálkozás**: Maximum 200 kombináció tesztelése
- **300 iteráció**: Alapanyag-szintű skálázáshoz

## 🤝 Közreműködés

1. Fork-öld a repository-t
2. Hozz létre egy feature branch-et (`git checkout -b feature/uj-funkcio`)
3. Commit-old a változtatásokat (`git commit -am 'Új funkció hozzáadása'`)
4. Push-old a branch-et (`git push origin feature/uj-funkcio`)
5. Hozz létre egy Pull Request-et

## 📝 Licenc

Ez a projekt MIT licenc alatt áll.

## 👨‍💻 Szerző

**Kaplonyi Tibor**

---

**Megjegyzés**: Ez a projekt fejlesztés alatt áll. A funkciók folyamatosan bővülnek és javítódnak.
=======
# etelterv
>>>>>>> b4d9e61e40817a3de1cbfa5c651d04e4cf5b100c
