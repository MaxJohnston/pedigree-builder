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
