// on next show exactly where the image is going to load
// contonue experimenting with observables ane deploy to some url
// 

const { Observable, pipe, operators, from, fromEvent, defer, of } = rxjs;
const { map, filter, mapTo, merge, mergeLatest, startWith, flatMap, scan, concat , switchMap, distinctUntilChanged, debounceTime } = operators;


const subsDropDown = document.getElementById('subs');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const LOADING_ERROR_URL = 'images/error.png';
const LOADING_URL = 'images/loading.svg';

const getSubImages = sub => {
  const cachedImages = localStorage.getItem(sub);
  if (cachedImages) {
      return of(JSON.parse(cachedImages));
  }
  else {
    const url = `https://www.reddit.com/r/${sub}/.json?limit=200&show=all`;
    return defer(() =>
      from(
        fetch(url).
          then(res => res.json()).
          then(data => {
            const images =
              data.data.children.map(image => image.data.url);
            localStorage.setItem(sub, JSON.stringify(images));
            return images;
          })));
  }
};

const preloader = urlData => {
  const image = new Image();
  const loader$ = defer(() => {
    document.querySelectorAll('img')[urlData.index].src = LOADING_URL;
    image.src = urlData.url;
    return fromEvent(image, 'load')
    .pipe(mapTo(urlData))
    .pipe(merge(fromEvent(image, 'error').pipe(mapTo({ url: LOADING_ERROR_URL, index: urlData.index}))))
  });

  return loader$;
}

const subs$ = fromEvent(subsDropDown, 'change')
                 .pipe(map(event => event.target.value))
                 .pipe(startWith(subsDropDown.value));

const navigate$ = fromEvent(prevButton, 'click')
                 .pipe(mapTo(-1))
                 .pipe(merge(fromEvent(nextButton, 'click').pipe(mapTo(1))));


const thumbnails$ = subs$
                 .pipe(flatMap(sub => getSubImages(sub)))
                 .pipe(switchMap(images => navigate$
                                              .pipe(startWith(0))
                                              .pipe(scan((acc, value) => {
                                                const index = acc + value;
                                                if (index < 0) { return 0; }
                                                if(index >= images.length) { return images.length; }
                                                return index;
                                              }, 0))
                                              .pipe(debounceTime(500))
                                              .pipe(distinctUntilChanged())
                                              .pipe(map(index => ({ url: images[index], index }) ))))
                 .pipe(switchMap(urlData => preloader(urlData)))

                 .subscribe(({ url, index }) => {
                   document.querySelectorAll('img')[index].src = url;

                 });
