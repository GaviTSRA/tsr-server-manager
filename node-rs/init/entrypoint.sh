#!/bin/sh
while [ ! -f /server/.ready ]; do
  sleep 0.2
done
rm -f /server/.ready
exec "$@"