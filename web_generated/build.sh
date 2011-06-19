#!/bin/bash
SRC_DIR="$(perl -e "use Cwd; use Cwd 'realpath'; print realpath('${0}');" | xargs dirname)"
DST_DIR="$(perl -e "use Cwd; use Cwd 'realpath'; print realpath('${SRC_DIR}');" | xargs dirname)"
DST_DIR="${DST_DIR}/web_generated"

echo "Source: ${SRC_DIR}"
echo "Destination: ${DST_DIR}"

MOVE_BIN="${SRC_DIR}/../bin/move"

cd "$SRC_DIR" || exit $?

# Check if DST_DIR is ok
if [ ! -d "$DST_DIR" ] || [ "$(git --work-tree="${DST_DIR}" branch --no-color | sed -e '/^[^*]/d' -e "s/* \(.*\)/\1/")" != "gh-pages" ]; then
  # Backup if modified
  if [ -d "$DST_DIR" ]; then
    BACKUP_DIR="${DST_DIR}_backup_"$(date +%s)
    echo "WARNING: ${DST_DIR} has been modified. Moving to ${BACKUP_DIR}"
    rm -rf "$BACKUP_DIR" || exit $?
    mv "$DST_DIR" "$BACKUP_DIR" || exit $?
  fi

  # Clone
  git clone --local --shared --no-checkout -- .. "$DST_DIR" || exit $?
  cd "$DST_DIR" || exit $?

  # Create or checkout gh-pages branch
  if (git show-ref --heads --quiet gh-pages); then
    git checkout gh-pages || exit $?
  else
    git symbolic-ref HEAD refs/heads/gh-pages || exit $?
    rm -f .git/index
  fi
  echo git clean -fdx || exit $?

  # Back home
  cd "$SRC_DIR" || exit $?
fi

# Build move
"$MOVE_BIN" ../browser/build.mv || exit $?

# Build website
jekyll --no-server --no-auto "$DST_DIR" || exit $?

# Commit
cd "$DST_DIR" || exit $?
git add . || exit $?
git commit -a -m 'Generated website' || exit $?
git remote -v
#git push origin gh-pages || exit $?

# Back home
cd "$SRC_DIR" || exit $?

echo "$DST_DIR"

