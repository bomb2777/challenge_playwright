// @ts-check
const { test, expect } = require('@playwright/test');

test('Login, place item on cart and checkout', async ({ page }) => {
  await page.goto('/');
  await login(page);

  // select item and go to cart
  await page.locator('.inventory_item').first().getByRole('button').click();
  await expect(page.locator('.inventory_item').first().getByRole('button')).toHaveText('Remove');
  await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  await page.locator('a.shopping_cart_link').click();
  await page.locator('.cart_item').waitFor();

  // go to checkout
  await page.getByRole('button', {name: 'Checkout'}).click();
  await page.locator('.checkout_info').waitFor();
  await expect(page.locator('.shopping_cart_badge')).toBeVisible();
  await page.getByPlaceholder('First Name').fill('Standard');
  await page.getByPlaceholder('Last Name').fill('User');
  await page.getByPlaceholder('Zip/Postal Code').fill('12345');

  // go to checkout overview and validate the most important infos
  await page.getByRole('button', {name: 'Continue'}).click();
  await page.locator('#checkout_summary_container').waitFor();
  await expect(page.locator('.shopping_cart_badge')).toBeVisible();
  await page.locator('.cart_item').waitFor();
  await expect(page.locator('.summary_value_label').first()).toHaveText(/SauceCard #\d+/);
  await expect(page.locator('.summary_subtotal_label').first()).toHaveText('Item total: $29.99');
  await expect(page.locator('.summary_tax_label').first()).toHaveText('Tax: $2.40');
  await expect(page.locator('.summary_total_label').first()).toHaveText('Total: $32.39');

  // go to success page
  await page.getByRole('button', {name: 'Finish'}).click();
  await page.locator('img.pony_express').waitFor();
  await expect(page.locator('.shopping_cart_badge')).not.toBeVisible();
  await expect(page.getByText('Thank you for your order!')).toBeVisible();

  // go back to home page
  await page.getByRole('button', {name: 'Back Home'}).click();
  await page.locator('.inventory_list').waitFor();
});

test('Validate price list sort functionality', async ({ page }) => {
  await page.goto('/');
  await login(page);

  // check sort order, expected: not sorted yet
  let priceList = await getPriceList(page);
  expect(isSorted(priceList)).toBeFalsy();

  // sort by low to high
  await page.locator('select.product_sort_container').selectOption('Price (low to high)');
  // Flakiness: after selecting a drop down option, sleeping a short moment could be necessary, if a webpage reacts slow due to performance or whatever (AND Playwright is too fast)
  // Since the list content usually is not hard-coded, it seems there is no other possibility (because there is no change indicator like api call, url change, loading spinner etc.)
  // await sleep(100);

  // check sort order, expected: should be sorted now
  priceList = await getPriceList(page);
  expect(isSorted(priceList)).toBeTruthy();
});

test('Remove items from cart', async ({ page }) => {
  await page.goto('/');
  await login(page);

  // select 2 items and go to cart
  await page.locator('.inventory_item').first().getByRole('button').click();
  await expect(page.locator('.inventory_item').first().getByRole('button')).toHaveText('Remove');
  await page.locator('.inventory_item').nth(1).getByRole('button').click();
  await expect(page.locator('.inventory_item').nth(1).getByRole('button')).toHaveText('Remove');
  await expect(page.locator('.shopping_cart_badge')).toHaveText('2');
  await page.locator('a.shopping_cart_link').click();
  await page.locator('.cart_item').nth(1).waitFor();
  await expect(page.locator('.cart_item')).toHaveCount(2);

  // remove second item
  await page.locator('.cart_item').nth(1).getByRole('button', {text: 'Remove'}).click();
  await page.locator('.cart_item').nth(1).waitFor({state: 'detached'});
  await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  await expect(page.locator('.cart_item')).toHaveCount(1);

  // go back to home page and validate list and cart badge
  await page.getByRole('button', {name: 'Continue Shopping'}).click();
  await expect(page.locator('.inventory_item').nth(1).getByRole('button')).toHaveText('Add to cart');
  await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
});

test('Logout', async ({ page }) => {
  await page.goto('/');
  await login(page);

  // open burger menu and logout
  await page.getByRole('button', {name: 'Open Menu'}).click();
  await page.locator('.bm-menu-wrap').waitFor();
  await page.getByRole('link').getByText('Logout').click();
  await page.getByRole('button', {name: 'Login'}).waitFor();
});

async function login(page) {
  await page.getByRole('button', {name: 'Login'}).waitFor();
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', {name: 'Login'}).click();
  await page.locator('.inventory_list').waitFor();
}

async function getPriceList(page) {
  // get prices of all items
  let priceItems = await page.locator('.inventory_item .inventory_item_price').all();
  let prices = [];
  // remove '$'
  for (let i = 0; i < priceItems.length; ++i) {
    prices[i] = await priceItems[i].textContent();
    prices[i] = prices[i].replace('$', '');
  }
  return prices.map(Number); // convert string values to numbers
}

function isSorted(array) {
  return array.every((value, index, array) => !index || array[index - 1] <= value);
}

function sleep(milliseconds) {
  return new Promise(r => setTimeout(r, milliseconds));
}