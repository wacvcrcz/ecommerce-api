const products = [
  {
    name: 'Liverpool Home Jersey 24/25',
    price: 89.99,
    description: 'Official Nike Liverpool FC 2024/2025 home kit. Premium quality with sweat-wicking technology.',
    images: ['https://www.soccerlord.se/wp-content/uploads/2019/04/Liverpool-Home-Football-Shirt-24-25.jpg'],
    inventory: [
        { size: 'S', quantity: 20 },
        { size: 'M', quantity: 20 },
        { size: 'L', quantity: 20 },
        { size: 'XL', quantity: 20 },
        { size: 'XXL', quantity: 20 }
    ],
    tags: ['football', 'liverpool', 'jersey']
  },
  {
    name: 'Real Madrid Away Jersey 24/25',
    price: 94.99,
    description: 'Adidas Real Madrid 24/25 away shirt in premium fan edition.',
    images: ['https://us.shop.realmadrid.com/_next/image?url=https%3A%2F%2Flegends.broadleafcloud.com%2Fapi%2Fasset%2Fcontent%2FRMCFMZ0919_01.jpg%3FcontextRequest%3D%257B%2522forceCatalogForFetch%2522%3Afalse%2C%2522forceFilterByCatalogIncludeInheritance%2522%3Afalse%2C%2522forceFilterByCatalogExcludeInheritance%2522%3Afalse%2C%2522applicationId%2522%3A%252201H4RD9NXMKQBQ1WVKM1181VD8%2522%2C%2522tenantId%2522%3A%2522REAL_MADRID%2522%257D&w=1200&q=50'],
    inventory: [
        { size: 'S', quantity: 16 },
        { size: 'M', quantity: 16 },
        { size: 'L', quantity: 16 },
        { size: 'XL', quantity: 16 },
        { size: 'XXL', quantity: 16 }
    ],
    tags: ['football', 'real madrid', 'jersey']
  },
  {
    name: 'FC Barcelona Third Kit 23/24',
    price: 99.95,
    description: 'Official Nike Barcelona third kit – limited edition release.',
    images: ['https://store.fcbarcelona.com/products/junior-home-jersey-25-26-fc-barcelona-players-edition-player-lamine-yamal-ucl'],
    inventory: [
        { size: 'S', quantity: 12 },
        { size: 'M', quantity: 12 },
        { size: 'L', quantity: 12 },
        { size: 'XL', quantity: 12 },
        { size: 'XXL', quantity: 12 }
    ],
    tags: ['football', 'barcelona', 'kit']
  },
  {
    name: 'LA Lakers LeBron James Jersey',
    price: 109.99,
    description: 'Official Nike NBA Lakers jersey – LeBron James Edition (Purple/Gold)',
    images: ['https://images.footballfanatics.com/los-angeles-lakers/mens-nike-lebron-james-purple-los-angeles-lakers-swingman-jersey-icon-edition_ss5_p-12050252+u-16swm6jql5y1ryp1htcx+v-bc8da7f7f1a342be8e2b74c973f905d6.jpg'],
    inventory: [
        { size: 'S', quantity: 15 },
        { size: 'M', quantity: 15 },
        { size: 'L', quantity: 15 },
        { size: 'XL', quantity: 15 },
        { size: 'XXL', quantity: 15 }
    ],
    tags: ['nba', 'lakers', 'lebron', 'jersey']
  },
  {
    name: 'Red Bull Racing F1 Team Polo',
    price: 69.99,
    description: 'Official Oracle Red Bull Racing Team Polo 2024 – lightweight and breathable.',
    images: ['https://f1store.formula1.com/productimages/13459588-1-redbull-racing-2024-team-polo-shirt.jpg'],
    inventory: [
        { size: 'S', quantity: 10 },
        { size: 'M', quantity: 10 },
        { size: 'L', quantity: 10 },
        { size: 'XL', quantity: 10 },
        { size: 'XXL', quantity: 10 }
    ],
    tags: ['f1', 'red bull', 'polo']
  },
  {
    name: 'Windbreaker Jacket – Black Elite',
    price: 59.99,
    description: 'Stylish black windbreaker jacket for training or casual wear.',
    images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246'],
    inventory: [
        { size: 'S', quantity: 18 },
        { size: 'M', quantity: 18 },
        { size: 'L', quantity: 18 },
        { size: 'XL', quantity: 18 },
        { size: 'XXL', quantity: 18 }
    ],
    tags: ['windbreaker', 'training']
  }
];

module.exports = products;