/* Pedigree Builder · js/sample-data.js
   The invented sample family shown until the viewer starts their own tree. */
'use strict';

/* ------------------------------------------------------------------
   SAMPLE TREE. Shown until the viewer edits it. Everything here is
   invented example data.
   People are numbered by Ahnentafel (Sosa) number:
   1 = root person; father of n is 2n, mother of n is 2n+1.
   So generation 2 = 2-3, gen 3 = 4-7, gen 4 = 8-15, gen 5 = 16-31.
   Person fields: n, name, b (birth year), d (death year), l (1 = living),
   bp, dp (birth/death place), occ, notes, spouse, children[], wiki, star.
   Advanced layout fields kept from the original chart (not edited in the form):
   fa, mo (pedigree collapse), mf, so, solo, ref.
   famous: [{id, name, title, b, d, wiki, routes:[{anc, half, note, path:[[name,b,d],...]}]}]
     path runs from the common ancestor's child down to the famous person's parent.
   haplo:  [{id, type:'y'|'mt', from, code, url, line}]
   dna:    [{id, type:'self'|'match'|'y'|'mt', anchor, src}]
------------------------------------------------------------------- */
var SAMPLE={v:1, sample:true, people:[
  {n:1,  name:'Jordan Ellis Whitaker', l:1, b:1994, bm:4, bdy:12, bp:'Columbus, Ohio', occ:'Civil engineer'},

  {n:2,  name:'Daniel Thomas Whitaker', l:1, b:1962, bm:9, bdy:3, bp:'Dayton, Ohio', occ:'High school teacher', children:['Jordan Ellis Whitaker','Claire Whitaker']},
  {n:3,  name:'Laura Bianchi', l:1, b:1964, bm:1, bdy:28, bp:'Cleveland, Ohio', occ:'Pharmacist', children:['Jordan Ellis Whitaker','Claire Whitaker']},

  {n:4,  name:'Thomas Harold Whitaker', b:1934, bm:6, bdy:17, d:2011, dm:2, ddy:8, bp:'Dayton, Ohio', dp:'Dayton, Ohio', occ:'Machinist'},
  {n:5,  name:'Margaret Anne Doyle', b:1936, d:2019, bp:'Toledo, Ohio', dp:'Dayton, Ohio', occ:'Nurse'},
  {n:6,  name:'Vincent Bianchi', b:1931, d:2008, bp:'Cleveland, Ohio', dp:'Cleveland, Ohio', occ:'Grocer'},
  {n:7,  name:'Helen Kowalski', b:1935, d:2020, bp:'Parma, Ohio', dp:'Cleveland, Ohio', occ:'Seamstress'},

  {n:8,  name:'Harold James Whitaker', b:1902, d:1978, bp:'Xenia, Ohio', dp:'Dayton, Ohio', occ:'Railroad brakeman'},
  {n:9,  name:'Edith Mae Lane', b:1905, d:1990, bp:'Springfield, Ohio', dp:'Dayton, Ohio'},
  {n:10, name:'Patrick Doyle', b:1899, d:1967, bp:'Toledo, Ohio', dp:'Toledo, Ohio', occ:'Dock worker'},
  {n:11, name:'Bridget Keane', b:1903, d:1981, bp:'Toledo, Ohio', dp:'Toledo, Ohio'},
  {n:12, name:'Salvatore Bianchi', b:1897, bm:11, bdy:2, d:1972, dm:8, bp:'Lucca, Tuscany, Italy', dp:'Cleveland, Ohio', occ:'Stonemason', notes:'Arrived at Ellis Island in 1913.'},
  {n:13, name:'Rosa Lombardi', b:1901, d:1985, bp:'Lucca, Tuscany, Italy', dp:'Cleveland, Ohio'},
  {n:14, name:'Stanisław Kowalski', b:1898, d:1960, bp:'Tarnów, Poland', dp:'Parma, Ohio', occ:'Steelworker'},
  {n:15, name:'Anna Nowak', b:1902, d:1979, bp:'Kraków, Poland', dp:'Parma, Ohio'},

  {n:16, name:'Samuel Whitaker', b:1871, bm:3, d:1940, bp:'Greene County, Ohio', dp:'Xenia, Ohio', occ:'Farmer'},
  {n:17, name:'Clara Hollis', b:1874, d:1949, bp:'Greene County, Ohio', dp:'Xenia, Ohio'},
  {n:18, name:'George Lane', b:1868, d:1931, bp:'Clark County, Ohio', dp:'Springfield, Ohio', occ:'Blacksmith'},
  {n:19, name:'Martha Pruitt', b:1872, d:1944, bp:'Clark County, Ohio', dp:'Springfield, Ohio'},
  {n:20, name:'Michael Doyle', b:1865, d:1922, bp:'County Wexford, Ireland', dp:'Toledo, Ohio', occ:'Laborer'},
  {n:21, name:'Mary Brennan', b:1869, d:1930, bp:'County Wexford, Ireland', dp:'Toledo, Ohio'},
  {n:22, name:'John Keane', b:1870, d:1936, bp:'County Clare, Ireland', dp:'Toledo, Ohio', occ:'Saloon keeper'},
  {n:23, name:'Catherine Walsh', b:1874, d:1950, bp:'County Clare, Ireland', dp:'Toledo, Ohio'},
  {n:24, name:'Giuseppe Bianchi', b:1866, d:1930, bp:'Lucca, Tuscany, Italy', dp:'Lucca, Tuscany, Italy', occ:'Stonemason', star:'Mayor of a Tuscan village (sample entry)'},
  {n:25, name:'Maria Esposito', b:1870, d:1938, bp:'Lucca, Tuscany, Italy', dp:'Lucca, Tuscany, Italy'},
  {n:26, name:'Antonio Lombardi', b:1872, d:1941, bp:'Lucca, Tuscany, Italy', dp:'Lucca, Tuscany, Italy', occ:'Olive grower'},
  {n:27, name:'Giulia Russo', b:1876, d:1952, bp:'Lucca, Tuscany, Italy', dp:'Lucca, Tuscany, Italy'},
  {n:28, name:'Józef Kowalski', b:1870, d:1931, bp:'Tarnów, Poland', dp:'Tarnów, Poland', occ:'Carpenter'},
  {n:29, name:'Zofia Wiśniewska', b:1874, d:1940, bp:'Tarnów, Poland', dp:'Tarnów, Poland'},
  {n:30, name:'Jan Nowak', b:1868, d:1929, bp:'Kraków, Poland', dp:'Kraków, Poland', occ:'Baker'},
  {n:31, name:'Katarzyna Zielińska', b:1873, d:1945, bp:'Kraków, Poland', dp:'Kraków, Poland'}
],
famous:[
  {id:'f1', name:'Eleanor Hayes', title:'Novelist (sample entry)', b:1931, d:2015, routes:[{anc:16, path:[['Ruth Whitaker',1899,1978]]}]},
  {id:'f2', name:'Frank Keane', title:'Olympic rower (sample entry)', b:1928, d:2004, routes:[{anc:22, path:[['Thomas Keane',1898,1970]]}]}
],
haplo:[
  {id:'h1', type:'y',  from:1, code:'R-M269'},
  {id:'h2', type:'mt', from:1, code:'H1'},
  {id:'h3', type:'y',  from:6, code:'J-M172'}
],
dna:[
  {id:'d1', type:'self',  anchor:2,  src:'Ancestry (sample)'},
  {id:'d2', type:'self',  anchor:3,  src:'23andMe (sample)'},
  {id:'d3', type:'y',     anchor:16, src:'FamilyTreeDNA Y-DNA test (sample)'},
  {id:'d4', type:'match', anchor:22, src:'Ancestry match with a third cousin (sample)'},
  {id:'d5', type:'yt',    anchor:6,  src:'FamilyTreeDNA Y-37 (sample)'},
  {id:'d6', type:'mtt',   anchor:7,  src:'FamilyTreeDNA mtFull Sequence (sample)'}
]};

/* A second sample: the ancestry of King Edward VII. His parents, Queen Victoria and Prince Albert, were first cousins,
   so the tree shows pedigree collapse in two ways (a shared couple linked once, and an ancestor in two generations)
   and "Show mother above father". Dates and relationships are from Wikipedia. */
var SAMPLE_ROYAL={v:1, sample:true, people:[
  {n:1, name:'Edward VII of the United Kingdom', fn:'Edward VII', ln:'of the United Kingdom', sex:'M', b:1841, bm:11, bdy:9, bp:'Buckingham Palace, London, England', d:1910, dm:5, ddy:6, dp:'Buckingham Palace, London, England', occ:'King of the United Kingdom as Edward VII, 1901–1910', star:'King Edward VII of the United Kingdom', wiki:'Edward_VII',
    notes:'Royal sample tree. Edward VII’s parents were first cousins, so some of his ancestors appear more than once. Open Queen Victoria, Prince Albert, Francis of Saxe-Coburg-Saalfeld and Frederick II of Saxe-Gotha-Altenburg to see how each case is handled.'},
  {n:2, name:'Albert of Saxe-Coburg and Gotha', fn:'Albert', ln:'of Saxe-Coburg and Gotha', b:1819, bm:8, bdy:26, bp:'Schloss Rosenau, Coburg, Germany', d:1861, dm:12, ddy:14, dp:'Windsor Castle, Berkshire, England', occ:'Prince Consort', wiki:'Albert,_Prince_Consort', mf:1,
    notes:'“Show mother above father” is ticked on this record. His father, Ernest I, is the brother of Queen Victoria’s mother, and the two are drawn side by side. Putting Albert’s mother on top moves them down, next to Queen Victoria’s side of the chart, so the line from Victoria to her mother no longer crosses Albert’s branch. Untick it to compare.',
    ev:[{id:'r-e1', t:'marr', date:'10 Feb 1840', y:1840, pl:'Chapel Royal, St James’s Palace, London', tx:'to his first cousin, Queen Victoria'}]},
  {n:3, name:'Victoria of the United Kingdom', fn:'Victoria', ln:'of the United Kingdom', b:1819, bm:5, bdy:24, bp:'Kensington Palace, London, England', d:1901, dm:1, ddy:22, dp:'Osborne House, Isle of Wight, England', occ:'Queen of the United Kingdom, 1837–1901', star:'Queen Victoria of the United Kingdom', wiki:'Queen_Victoria',
    ev:[{id:'r-e2', t:'marr', date:'10 Feb 1840', y:1840, pl:'Chapel Royal, St James’s Palace, London', tx:'to her first cousin, Prince Albert'}],
    notes:'Her mother, Victoria of Saxe-Coburg-Saalfeld, was the sister of Prince Albert’s father, Ernest I, so Victoria and Albert were first cousins.'},
  {n:4, name:'Ernest I of Saxe-Coburg and Gotha', fn:'Ernest I', ln:'of Saxe-Coburg and Gotha', b:1784, bm:1, bdy:2, bp:'Coburg, Germany', d:1844, dm:1, ddy:29, dp:'Gotha, Germany', occ:'Duke of Saxe-Coburg and Gotha', wiki:'Ernest_I,_Duke_of_Saxe-Coburg_and_Gotha'},
  {n:5, name:'Louise of Saxe-Gotha-Altenburg', fn:'Louise', ln:'of Saxe-Gotha-Altenburg', b:1800, bm:12, bdy:21, bp:'Gotha, Germany', d:1831, dm:8, ddy:30, dp:'Paris, France', wiki:'Princess_Louise_of_Saxe-Gotha-Altenburg_(1800–1831)'},
  {n:6, name:'Edward Augustus of Kent', fn:'Edward', mn:'Augustus', ln:'of Kent', b:1767, bm:11, bdy:2, bp:'Buckingham House, London, England', d:1820, dm:1, ddy:23, dp:'Sidmouth, Devon, England', occ:'Duke of Kent and Strathearn', wiki:'Prince_Edward,_Duke_of_Kent_and_Strathearn'},
  {n:7, name:'Victoria of Saxe-Coburg-Saalfeld', fn:'Victoria', ln:'of Saxe-Coburg-Saalfeld', mln:'of Kent', b:1786, bm:8, bdy:17, bp:'Coburg, Germany', d:1861, dm:3, ddy:16, dp:'Frogmore House, Windsor, England', occ:'Duchess of Kent', wiki:'Princess_Victoria_of_Saxe-Coburg-Saalfeld', fa:8, mo:9,
    notes:'Sister of Ernest I (Prince Albert’s father). Her parents are linked to the same cards as his, so Francis and Augusta are drawn once, with lines to both of their children.'},
  {n:8, name:'Francis of Saxe-Coburg-Saalfeld', fn:'Francis', ln:'of Saxe-Coburg-Saalfeld', b:1750, bm:7, bdy:15, bp:'Coburg, Germany', d:1806, dm:12, ddy:9, dp:'Coburg, Germany', occ:'Duke of Saxe-Coburg-Saalfeld', wiki:'Francis,_Duke_of_Saxe-Coburg-Saalfeld',
    notes:'Pedigree collapse in the same generation: great-grandfather of Edward VII through both of his parents. His ancestor ratio is 1/4 instead of the usual 1/8 for a great-grandparent.'},
  {n:9, name:'Augusta Caroline Sophie Reuss of Ebersdorf', fn:'Augusta', mn:'Caroline Sophie', ln:'Reuss of Ebersdorf', b:1757, bm:1, bdy:19, bp:'Ebersdorf, Thuringia, Germany', d:1831, dm:11, ddy:16, dp:'Coburg, Germany', wiki:'Countess_Augusta_Reuss_of_Ebersdorf'},
  {n:10, name:'Augustus of Saxe-Gotha-Altenburg', fn:'Augustus', ln:'of Saxe-Gotha-Altenburg', b:1772, bm:11, bdy:23, bp:'Gotha, Germany', d:1822, dm:5, ddy:17, dp:'Gotha, Germany', occ:'Duke of Saxe-Gotha-Altenburg', wiki:'Augustus,_Duke_of_Saxe-Gotha-Altenburg'},
  {n:11, name:'Louise Charlotte of Mecklenburg-Schwerin', fn:'Louise', mn:'Charlotte', ln:'of Mecklenburg-Schwerin', b:1779, d:1801, dm:1, ddy:4},
  {n:12, name:'George III of Great Britain', fn:'George III', ln:'of Great Britain', b:1738, bm:6, bdy:4, bp:'London, England', d:1820, dm:1, ddy:29, dp:'Windsor Castle, Berkshire, England', occ:'King of Great Britain and Ireland as George III, 1760–1820', star:'King George III', wiki:'George_III'},
  {n:13, name:'Charlotte of Mecklenburg-Strelitz', fn:'Charlotte', ln:'of Mecklenburg-Strelitz', b:1744, bm:5, bdy:19, d:1818, dm:11, ddy:17, dp:'Kew Palace, Surrey, England', occ:'Queen consort', wiki:'Charlotte_of_Mecklenburg-Strelitz'},
  {n:16, name:'Ernest Frederick of Saxe-Coburg-Saalfeld', fn:'Ernest', mn:'Frederick', ln:'of Saxe-Coburg-Saalfeld', occ:'Duke of Saxe-Coburg-Saalfeld'},
  {n:17, name:'Sophie Antoinette of Brunswick-Wolfenbüttel', fn:'Sophie', mn:'Antoinette', ln:'of Brunswick-Wolfenbüttel'},
  {n:18, name:'Heinrich XXIV Reuss of Ebersdorf', fn:'Heinrich XXIV', ln:'Reuss of Ebersdorf', occ:'Count Reuss of Ebersdorf'},
  {n:19, name:'Karoline Ernestine of Erbach-Schönberg', fn:'Karoline', mn:'Ernestine', ln:'of Erbach-Schönberg'},
  {n:20, name:'Ernest II of Saxe-Gotha-Altenburg', fn:'Ernest II', ln:'of Saxe-Gotha-Altenburg', b:1745, bm:1, bdy:30, bp:'Gotha, Germany', d:1804, dm:4, ddy:20, dp:'Gotha, Germany', occ:'Duke of Saxe-Gotha-Altenburg', wiki:'Ernest_II,_Duke_of_Saxe-Gotha-Altenburg', mf:1,
    notes:'“Show mother above father” is ticked on this record, so his son Frederick III is drawn below his mother, nearer Augusta of Saxe-Gotha, whose line also leads to Frederick III’s parents.'},
  {n:21, name:'Charlotte of Saxe-Meiningen', fn:'Charlotte', ln:'of Saxe-Meiningen', b:1751, d:1827},
  {n:24, name:'Frederick Louis of Great Britain', fn:'Frederick', mn:'Louis', ln:'of Great Britain', b:1707, bm:2, bdy:1, d:1751, dm:3, ddy:31, occ:'Prince of Wales', wiki:'Frederick,_Prince_of_Wales'},
  {n:25, name:'Augusta of Saxe-Gotha', fn:'Augusta', ln:'of Saxe-Gotha', b:1719, bm:11, bdy:30, bp:'Gotha, Germany', d:1772, dm:2, ddy:8, dp:'Carlton House, London, England', occ:'Princess of Wales', wiki:'Augusta_of_Saxe-Gotha',
    notes:'Sister of Frederick III of Saxe-Gotha-Altenburg, Prince Albert’s great-great-grandfather.'},
  {n:40, name:'Frederick III of Saxe-Gotha-Altenburg', fn:'Frederick III', ln:'of Saxe-Gotha-Altenburg', b:1699, bm:4, bdy:14, bp:'Gotha, Germany', d:1772, dm:3, ddy:10, dp:'Gotha, Germany', occ:'Duke of Saxe-Gotha-Altenburg', wiki:'Frederick_III,_Duke_of_Saxe-Gotha-Altenburg', fa:50, mo:51,
    notes:'Brother of Augusta, Princess of Wales, who is a generation nearer on Queen Victoria’s side. Their parents are drawn once, behind him, and Augusta’s line skips a generation to reach them.'},
  {n:41, name:'Luise Dorothea of Saxe-Meiningen', fn:'Luise', mn:'Dorothea', ln:'of Saxe-Meiningen', b:1710, d:1767},
  {n:50, name:'Frederick II of Saxe-Gotha-Altenburg', fn:'Frederick II', ln:'of Saxe-Gotha-Altenburg', b:1676, bm:7, bdy:28, bp:'Gotha, Germany', d:1732, dm:3, ddy:23, dp:'Altenburg, Germany', occ:'Duke of Saxe-Gotha-Altenburg', wiki:'Frederick_II,_Duke_of_Saxe-Gotha-Altenburg',
    notes:'Pedigree collapse across generations: a 4th great-grandfather of Edward VII through Queen Victoria and a 5th great-grandfather through Prince Albert. He is drawn once, in the further generation, and the line from his daughter Augusta skips a generation to reach him.'},
  {n:51, name:'Magdalena Augusta of Anhalt-Zerbst', fn:'Magdalena', mn:'Augusta', ln:'of Anhalt-Zerbst', b:1679, bm:10, bdy:13, d:1740, dm:10, ddy:11, wiki:'Magdalena_Augusta_of_Anhalt-Zerbst'},
  {n:102, name:'Karl of Anhalt-Zerbst', fn:'Karl', ln:'of Anhalt-Zerbst', occ:'Prince of Anhalt-Zerbst'},
  {n:103, name:'Sophia of Saxe-Weissenfels', fn:'Sophia', ln:'of Saxe-Weissenfels'}
], famous:[], haplo:[], dna:[]};

/* Fictional sample: the ancestry of Jon Snow (A Song of Ice and Fire). Generations of Targaryen marriages between
   relatives make the same ancestors appear many times over twenty generations. */
var SAMPLE_SNOW={v:1, sample:true, people:[
  {n:1, name:"Jon Snow", fn:"Jon", ln:"Snow", sex:"M", b:283, bp:"Dorne"},
  {n:2, name:"Rhaegar Targaryen", fn:"Rhaegar", ln:"Targaryen", b:259, bp:"Summerhall, Stormlands, Westeros", d:283, dp:"The Trident, Riverlands, Westeros", notes:"Spouse: Elia Martell; Lyanna Stark", children:["Rhaenys Targaryen", "Aegon Targaryen"]},
  {n:3, name:"Lyanna Stark", fn:"Lyanna", ln:"Stark", b:266, bq:"abt", d:283, dp:"Tower of Joy, Dorne", children:["Rhaenys Targaryen", "Aegon Targaryen"]},
  {n:4, name:"Aerys Targaryen II", fn:"Aerys", ln:"Targaryen", sx:"II", b:244, bp:"King's Landing, Westeros", d:283, dp:"Red Keep, King's Landing, Westeros", children:["Viserys Targaryen", "Daenerys Targaryen"]},
  {n:5, name:"Rhaella Targaryen", fn:"Rhaella", ln:"Targaryen", b:259, d:284, fa:8, mo:9, children:["Viserys Targaryen", "Daenerys Targaryen"]},
  {n:6, name:"Rickard Stark", fn:"Rickard", ln:"Stark", mf:1, b:230, bq:"aft", d:282, children:["Brandon Stark", "Eddard Stark", "Benjen Stark"]},
  {n:7, name:"Lyarra Stark", fn:"Lyarra", ln:"Stark", b:215, bq:"aft", d:299, dq:"bef", children:["Brandon Stark", "Eddard Stark", "Benjen Stark"]},
  {n:8, name:"Jaehaerys Targaryen II", fn:"Jaehaerys", ln:"Targaryen", sx:"II", b:225, bp:"King's Landing, Westeros", d:262, dp:"King's Landing, Westeros"},
  {n:9, name:"Shaera Targaryen", fn:"Shaera", ln:"Targaryen", b:226, d:259, fa:16, mo:17},
  {n:12, name:"Edwyle Stark", fn:"Edwyle", ln:"Stark", mf:1, b:197, bq:"aft", d:262, dq:"bef"},
  {n:13, name:"Marna Locke", fn:"Marna", ln:"Locke"},
  {n:14, name:"Rodrik Stark", fn:"Rodrik", ln:"Stark"},
  {n:15, name:"Arya Flint", fn:"Arya", ln:"Flint"},
  {n:16, name:"Aegon Targaryen V", fn:"Aegon", ln:"Targaryen", sx:"V", b:200, bp:"King's Landing, Westeros", d:259, dp:"Summerhall, Stormlands, Westeros", children:["Rhaelle Targaryen"]},
  {n:17, name:"Betha Blackwood", fn:"Betha", ln:"Blackwood", b:201, d:239, children:["Rhaelle Targaryen"]},
  {n:24, name:"Willam Stark", fn:"Willam", ln:"Stark", b:185, bq:"aft", d:226, fa:28, mo:29},
  {n:25, name:"Melantha Blackwood", fn:"Melantha", ln:"Blackwood"},
  {n:28, name:"Beron Stark", fn:"Beron", ln:"Stark", b:172, bq:"aft", d:226, dq:"bef"},
  {n:29, name:"Lorra Royce", fn:"Lorra", ln:"Royce"},
  {n:32, name:"Maekar Targaryen I", fn:"Maekar", ln:"Targaryen", sx:"I", b:174, bq:"abt", bp:"King's Landing, Westeros", d:233, dp:"Starpike, The Reach, Westeros", children:["Daeron Targaryen", "Aerion Targaryen", "Aemon Targaryen", "Daella Targaryen", "Rhae Targaryen"]},
  {n:33, name:"Dyanna Dayne", fn:"Dyanna", ln:"Dayne", children:["Daeron Targaryen", "Aerion Targaryen", "Aemon Targaryen", "Daella Targaryen", "Rhae Targaryen"]},
  {n:56, name:"Brandon Stark", fn:"Brandon", ln:"Stark", b:140, bq:"aft", d:212, dq:"bef"},
  {n:57, name:"Alys Karstark", fn:"Alys", ln:"Karstark"},
  {n:64, name:"Daeron Targaryen II", fn:"Daeron", ln:"Targaryen", sx:"II", b:153, bp:"King's Landing, Westeros", d:209, dp:"King's Landing, Westeros", children:["Rhaegel Targaryen", "Baelor Targaryen", "Aerys Targaryen I"]},
  {n:65, name:"Myriah Martell", fn:"Myriah", ln:"Martell", d:184, children:["Rhaegel Targaryen", "Baelor Targaryen", "Aerys Targaryen I"]},
  {n:112, name:"Cregan Stark", fn:"Cregan", ln:"Stark", b:108, d:209, dq:"bef"},
  {n:113, name:"Lynara Stark", fn:"Lynara", ln:"Stark"},
  {n:128, name:"Aegon Targaryen IV", fn:"Aegon", ln:"Targaryen", sx:"IV", b:135, bp:"King's Landing, Westeros", d:184, dp:"King's Landing, Westeros", notes:"Spouse: Melissa Blackwood; Naerys Targaryen", children:["Brynden \"Bloodraven\" Rivers"]},
  {n:129, name:"Naerys Targaryen", fn:"Naerys", ln:"Targaryen", b:138, fa:256, mo:257, children:["Brynden \"Bloodraven\" Rivers"]},
  {n:130, name:"Nymeros Martell", fn:"Nymeros", ln:"Martell"},
  {n:224, name:"Rickon Stark", fn:"Rickon", ln:"Stark", d:121},
  {n:225, name:"Gilliane Glover", fn:"Gilliane", ln:"Glover"},
  {n:256, name:"Viserys Targaryen II", fn:"Viserys", ln:"Targaryen", sx:"II", b:122, bp:"Dragonstone, Westeros", d:172, dp:"King's Landing, Westeros"},
  {n:257, name:"Larra Rogare", fn:"Larra", ln:"Rogare", b:115, d:145},
  {n:448, name:"Benjen Stark", fn:"Benjen", ln:"Stark", d:121, dq:"bef"},
  {n:449, name:"Lysa Locke", fn:"Lysa", ln:"Locke"},
  {n:512, name:"Daemon Targaryen", fn:"Daemon", ln:"Targaryen", d:130, notes:"Spouse: Rhaenyra Targaryen; Laena Velaryon", children:["Aegon Targaryen III", "Baela Targaryen", "Rhaena Targaryen", "Jacaerys Velaryon", "Lucerys Velaryon", "Joffrey Velaryon"]},
  {n:513, name:"Rhaenyra Targaryen", fn:"Rhaenyra", ln:"Targaryen", d:130, notes:"Spouse: Daemon Targaryen; Laenor Velaryon; Harwin Strong", children:["Aegon Targaryen III", "Baela Targaryen", "Rhaena Targaryen", "Jacaerys Velaryon", "Lucerys Velaryon", "Joffrey Velaryon"]},
  {n:514, name:"Lysandro Rogare", fn:"Lysandro", ln:"Rogare"},
  {n:1024, name:"Baelon Targaryen", fn:"Baelon", ln:"Targaryen", d:101},
  {n:1025, name:"Alyssa Targaryen", fn:"Alyssa", ln:"Targaryen", fa:2048, mo:2049},
  {n:1026, name:"Viserys Targaryen I", fn:"Viserys", ln:"Targaryen", sx:"I", d:129, notes:"Spouse: Aemma Arryn; Alicent Hightower", fa:1024, mo:1025, children:["Aegon Targaryen II", "Helaena Targaryen", "Aemond Targaryen", "Daeron Targaryen"]},
  {n:1027, name:"Aemma Arryn", fn:"Aemma", ln:"Arryn", d:105, children:["Aegon Targaryen II", "Helaena Targaryen", "Aemond Targaryen", "Daeron Targaryen"]},
  {n:2048, name:"Jaehaerys Targaryen I", fn:"Jaehaerys", ln:"Targaryen", sx:"I", d:103, children:["Aemon Targaryen", "Saera Targaryen"]},
  {n:2049, name:"Alysanne Targaryen", fn:"Alysanne", ln:"Targaryen", d:100, fa:4096, mo:4097, children:["Aemon Targaryen", "Saera Targaryen"]},
  {n:2054, name:"Rodrik Arryn", fn:"Rodrik", ln:"Arryn"},
  {n:2055, name:"Daella Targaryen", fn:"Daella", ln:"Targaryen", fa:2048, mo:2049},
  {n:4096, name:"Aenys Targaryen I", fn:"Aenys", ln:"Targaryen", sx:"I", children:["Rhaena Targaryen", "Aegon Targaryen", "Viserys Targaryen", "Boremund Baratheon", "Jocelyn Baratheon"]},
  {n:4097, name:"Alyssa Velaryon", fn:"Alyssa", ln:"Velaryon", dp:"Storm's End, Westeros", notes:"Spouse: Rogar Baratheon; Aenys Targaryen I", children:["Rhaena Targaryen", "Aegon Targaryen", "Viserys Targaryen", "Boremund Baratheon", "Jocelyn Baratheon"]},
  {n:4108, name:"Rymond Arryn", fn:"Rymond", ln:"Arryn"},
  {n:8192, name:"Aegon Targaryen I", fn:"Aegon", ln:"Targaryen", sx:"I", notes:"Spouse: Visenya Targaryen; Rhaenys Targaryen", children:["Maegor Targaryen I"]},
  {n:8193, name:"Rhaenys Targaryen", fn:"Rhaenys", ln:"Targaryen", fa:16384, mo:16385, children:["Maegor Targaryen I"]},
  {n:8194, name:"Aethan Velaryon", fn:"Aethan", ln:"Velaryon", children:["Daemon Velaryon"]},
  {n:8195, name:"Alarra Massey", fn:"Alarra", ln:"Massey", children:["Daemon Velaryon"]},
  {n:16384, name:"Aerion Targaryen", fn:"Aerion", ln:"Targaryen", children:["Visenya Targaryen", "Orys Baratheon"]},
  {n:16385, name:"Valaena Velaryon", fn:"Valaena", ln:"Velaryon", children:["Visenya Targaryen", "Orys Baratheon"]},
  {n:16388, name:"Daemon Velaryon", fn:"Daemon", ln:"Velaryon"},
  {n:32768, name:"Daemion Targaryen", fn:"Daemion", ln:"Targaryen", bp:"Dragonstone, Westeros", dp:"Dragonstone, Westeros"},
  {n:65536, name:"Aerys Targaryen", fn:"Aerys", ln:"Targaryen", bp:"Dragonstone, Westeros", children:["Baelon Targaryen", "Aelyx Targaryen"]},
  {n:131072, name:"Aegon Targaryen", fn:"Aegon", ln:"Targaryen", bp:"Dragonstone, Westeros", children:["Maegon Targaryen"]},
  {n:131073, name:"Elaena Targaryen", fn:"Elaena", ln:"Targaryen", fa:262144, mo:262145, children:["Maegon Targaryen"]},
  {n:262144, name:"Gaemon Targaryen", fn:"Gaemon", ln:"Targaryen", bp:"Valyria, Essos", dp:"Dragonstone, Westeros"},
  {n:262145, name:"Daenys \"The Dreamer\" Targaryen", fn:"Daenys", mn:"\"The Dreamer\"", ln:"Targaryen", bp:"Valyria, Essos", dp:"Dragonstone, Westeros", fa:524288},
  {n:524288, name:"Aenar \"The Exile\" Targaryen", fn:"Aenar", mn:"\"The Exile\"", ln:"Targaryen", bp:"Valyria, Essos", dp:"Dragonstone, Westeros"}
], famous:[], haplo:[], dna:[]};
