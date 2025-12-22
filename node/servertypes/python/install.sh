if [ -n "$PACKAGES" ]; then
   # install python packagess in venv
   # the venv may not exist yet, in which case it needs to be created first (checked using dir )
   if [ ! -d "venv" ]; then
      python3 -m venv venv
   fi

   source venv/bin/activate
   pip install $PACKAGES
fi