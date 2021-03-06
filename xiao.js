/* global CustomEvent */

(function (window) {
  'use strict'

  function Xiao (routes, defaultId, options) {
    options = options || {}
    this.settings = {
      showHide: true,
      separator: '|',
      arrived: null,
      departed: null
    }

    for (var setting in options) {
      if (options.hasOwnProperty(setting)) {
        this.settings[setting] = options[setting]
      }
    }

    this.ids = routes.map(route => route.id)
    this.title = document.title
    this.firstRun = true

    var elem = id => {
      return document.getElementById(id)
    }

    var url = () => {
      return window.location.href
    }

    var each = Array.prototype.forEach

    var routeById = id => {
      return routes.find(route => id === route.id)
    }

    var linksById = id => {
      return document.querySelectorAll('[href*="#' + id + '"]')
    }

    var idByURL = string => {
      return string.includes('#') ? string.match(/#.*?(\?|$)/gi)[0].replace('?', '').substr(1) : null
    }

    var paramsToObj = string => {
      var query = string.includes('?') ? string.match(/\?.*?(#|$)/gi)[0].replace('#', '').substr(1) : null
      return query ? JSON.parse('{"' + decodeURI(query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : null
    }

    var routeExists = id => {
      return this.ids.find(route => elem(route).contains(elem(id)))
    }

    var getLabel = route => {
      var h = elem(route.id).querySelector('h1, h2')
      return h ? h.textContent : route.label ? route.label : route.id
    }

    var reconfigure = (newRoute, oldRoute, oldURL, focusId) => {
      if (this.settings.showHide) {
        this.ids.forEach(id => {
          elem(id).hidden = true
        })
      }

      var newRegion = elem(newRoute)
      if (newRegion) {
        if (this.settings.showHide) {
          newRegion.hidden = false
        }
        if (!this.firstRun) {
          elem(focusId).setAttribute('tabindex', '-1')
          elem(focusId).focus()
        } else {
          this.firstRun = false
        }
      }

      var oldParams = oldURL ? paramsToObj(oldURL) : null

      if (oldRoute && routeExists(oldRoute)) {
        if (this.settings.departed) {
          this.settings.departed(elem(oldRoute), oldParams, routes)
        }
        if (routeById(oldRoute).departed) {
          routeById(oldRoute).departed(elem(oldRoute), oldParams, routes)
        }
      }

      var newParams = paramsToObj(url())
      if (this.settings.arrived) {
        this.settings.arrived(elem(newRoute), newParams, routes)
      }
      if (routeById(newRoute).arrived) {
        routeById(newRoute).arrived(elem(newRoute), newParams, routes)
      }

      each.call(document.querySelectorAll('[aria-current]'), link => {
        link.removeAttribute('aria-current')
      })
      each.call(linksById(newRoute), link => {
        link.setAttribute('aria-current', 'true')
      })

      document.title = `${this.title} ${this.settings.separator} ${getLabel(routeById(newRoute))}`

      if (this.settings.showHide && newRoute === focusId) {
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }

      var reroute = new CustomEvent('reroute', {
        detail: {
          newRoute: routeById(newRoute),
          oldRoute: routeById(oldRoute)
        }
      })
      window.dispatchEvent(reroute)
    }

    window.addEventListener('load', e => {
      routes.forEach(route => {
        var region = elem(route.id)
        region.setAttribute('role', 'region')
        region.setAttribute('aria-label', getLabel(route))
      })

      var hash = idByURL(url())

      if (!hash || !routeExists(hash)) {
        this.reroute(defaultId)
      } else {
        reconfigure(routeExists(hash), null, null, hash)
      }
    })

    window.addEventListener('hashchange', e => {
      var id = idByURL(url())
      var newRoute = routeExists(id)
      var oldId = e.oldURL.includes('#') ? idByURL(e.oldURL) : null
      var oldRoute = oldId ? routeExists(oldId) : null

      if (newRoute && newRoute !== oldRoute) {
        var focusId = id === newRoute ? newRoute : id
        reconfigure(newRoute, oldRoute, e.oldURL || null, focusId)
      }
    })
  }

  Xiao.prototype.reroute = function (id, params) {
    window.location.hash = (params || '') + id
    return this
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Xiao
  } else {
    window.Xiao = Xiao
  }
}(this))
