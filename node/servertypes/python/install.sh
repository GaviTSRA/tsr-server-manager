if [ -n "$PACKAGES" ]; then
   if [ ! -d "venv" ]; then
      python3 -m venv venv
   fi

   venv/bin/pip install $PACKAGES
fi