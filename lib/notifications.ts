export async function sendNotification(title: string, body: string) {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return
  }

  if (Notification.permission === 'granted') {
    // Create notification without vibrate to avoid TypeScript error
    new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png'
    })
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification(title, { 
        body, 
        icon: '/icon-192x192.png' 
      })
    }
  }
}
