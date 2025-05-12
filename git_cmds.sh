git init
git add .


ssh-keygen -t ecdsa-sha2-nistp521 -C "gvamosi@github.com"
#add pub key on github

git remote remove master
git remote add master git@github.com:gergelyvamosi/fileupload.git
git push master master

git pull master master
