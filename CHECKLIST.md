# Pre-deploy Checklist

Before running `git push origin main`, test this locally (npm run dev):

## Basic
- [ ] App opens without a blank screen
- [ ] Login works
- [ ] Sidebar navigates between modules without errors

## Module you changed
- [ ] Table renders with data
- [ ] Creating a new record works
- [ ] Editing and saving a row works
- [ ] Search/sort/pagination works (if applicable)

## After deploying on Easypanel
- [ ] Build finished green (no red errors)
- [ ] Open itasklegal.creativemakelab.com in incognito mode
- [ ] Log in and check the module you changed
- [ ] Check browser console (F12) for red errors

## If something breaks
- Check the deploy logs in Easypanel
- If it's serious, roll back to the previous version:
  `git revert HEAD` → `git push origin main`
