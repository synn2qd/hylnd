# HYLND Esports Website

## Deploy to GitHub Pages

1. Unzip this archive
2. Create a new GitHub repository (e.g. `hylnd-website`)
3. Push all files to the `main` branch:

```bash
git init
git add .
git commit -m "Initial HYLND site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

4. Go to **Settings → Pages** in your repo
5. Set Source to **Deploy from branch → main → / (root)**
6. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## File Structure

```
index.html              ← main site
assets/
  css/
    styles.css          ← all styles
  js/
    main.js             ← all scripts
  images/
    img_00.png          ← HYLND logo
    img_01.png          ← news image 1
    ...                 ← all other images
```

## Custom Domain (optional)

Create a file called `CNAME` in the root with your domain:
```
hylnd.gg
```
