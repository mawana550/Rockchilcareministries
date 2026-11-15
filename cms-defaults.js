/* The pictures/children the website shipped with. The admin dashboard uses
   these for its one-click "Import what the website has now" buttons. */
window.CMS_DEFAULTS = {
  children: [
    { name: 'Haniffah', sub: '', img: '/niffa.jpg' },
    { name: 'Sukran', sub: '', img: '/suki_after.jpeg' },
    { name: 'Puis', sub: '', img: '/pius.jpg' },
    { name: 'Joram', sub: '', img: '/muzie_afer.jpg' },
    { name: 'Nakato', sub: '', img: '/Nakatob4.jpeg' },
    { name: 'The list continues', sub: 'Contact for more', img: '/other_kids.jpeg' }
  ],
  gallery: ['IMG_7922','IMG_0716','IMG_0722','IMG_0725','IMG_0726','IMG_1152','IMG_1453','IMG_1457','IMG_1460',
    'IMG_1462','IMG_1564','IMG_0436','IMG_0514','IMG_0719','IMG_0724','IMG_1146','IMG_1148','IMG_1150','IMG_1151',
    'IMG_8583','IMG_9691','IMG_0720','IMG_4543','IMG_1455','IMG_1153','IMG_1149','IMG_0721','IMG_0715']
    .map(function (n) { return { src: '/' + n + '.jpg', caption: 'Our moments of hope' }; }),
  beforeAfter: [
    { before_src: '/muzieb4.jpeg', after_src: '/muzie_afer.jpg', before_caption: 'Then, everything was a dream.', after_caption: 'Educated, confident, empowered.' },
    { before_src: '/IMG_1645.jpeg', after_src: '/suki_after.jpeg', before_caption: 'Five siblings, one shared journey.', after_caption: 'After the touch of hope.' },
    { before_src: '/stuart_b4.jpeg', after_src: '/IMG_1261.jpeg', before_caption: 'Where the story began.', after_caption: 'A community lifted by hope.' },
    { before_src: '/siamab4.jpeg', after_src: '/Saima_aftar.jpeg', before_caption: 'Where the story began.', after_caption: 'A community lifted by hope.' }
  ]
};
