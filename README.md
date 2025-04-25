# challenge_playwright

- in order to execute tests, run:
```
yarn install
npx playwright install
npx playwright test --retries=0 --workers=6 --repeat-each=1 --trace=on tests/demo_shop.spec.js
```