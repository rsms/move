#!/bin/bash
set -e
set -x # debug
SRC_DIR="$(perl -e "use Cwd; use Cwd 'realpath'; use File::Basename; print realpath(dirname('${0}'));")"
DST_DIR="$(dirname "$SRC_DIR")/web_generated"
BUILD_DST_DIR="${SRC_DIR}/.build"
GIT_SRC_DIR="$(dirname "$SRC_DIR")"
MOVE_BIN="${SRC_DIR}/../bin/move"

echo "Building from ${SRC_DIR} -> ${DST_DIR}"

pushd "$SRC_DIR" >/dev/null

# Check if DST_DIR is ok
if [ ! -d "$DST_DIR" ] || [ "$(git --git-dir="${DST_DIR}/.git" branch --no-color | sed -e '/^[^*]/d' -e "s/* \(.*\)/\1/")" != "gh-pages" ]; then
  # Backup if modified
  if [ -d "$DST_DIR" ]; then
    BACKUP_DIR="${DST_DIR}_backup_"$(date +%s)
    echo "WARNING: ${DST_DIR} has been modified. Moving to ${BACKUP_DIR}"
    rm -rf "$BACKUP_DIR"
    mv "$DST_DIR" "$BACKUP_DIR"
  fi

  # Clone
  git clone --local --shared --no-checkout -- \
    "$GIT_SRC_DIR" "$DST_DIR"

  cd "$DST_DIR"

  # Create or checkout gh-pages branch
  if (git show-ref --heads --quiet gh-pages); then
    git checkout gh-pages
  else
    git symbolic-ref HEAD refs/heads/gh-pages
    rm -f .git/index
  fi
  echo git clean -fdx

  # Back home
  cd "$SRC_DIR"
fi

# Build move
"$MOVE_BIN" build-weblib

# Build website
rm -rf "$BUILD_DST_DIR"

# jekyll serve --watch --limit_posts 10

jekyll build "$BUILD_DST_DIR"
mv "$DST_DIR/.git" "$BUILD_DST_DIR/.git"
rm -rf "$DST_DIR"
mv -f "$BUILD_DST_DIR" "$DST_DIR"

# Create .nojekyll
touch "$DST_DIR/.nojekyll"

# Commit
cd "$DST_DIR"
git add .
if (git commit --no-status -a -m 'Generated website'); then
  git remote set-url origin "$GIT_SRC_DIR"
  if ! (git push origin gh-pages 2>/dev/null); then
    git pull origin gh-pages
    git push origin gh-pages
  fi
fi

popd >/dev/null

echo "---- Done ---- Deploy with:"
echo "  git push origin gh-pages"
